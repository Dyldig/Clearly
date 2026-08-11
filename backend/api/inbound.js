// Vercel serverless function (Node.js runtime). Receives Postmark's inbound
// email webhook, extracts a structured summary via Claude, and stores the
// result in Supabase. Deploy this by pointing a Vercel project's Root
// Directory at `backend/` — Vercel auto-detects files under `api/` as
// serverless functions, reachable at <deployment-url>/api/inbound.

const { randomUUID } = require('crypto');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_BASIC_AUTH = process.env.WEBHOOK_BASIC_AUTH; // "user:password" — must match Postmark's inbound stream auth

const EXTRACT_TOOL = {
  name: 'extract_message',
  description: 'Extract structured fields from a forwarded parent-communication email.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short title, under 8 words.' },
      summary: { type: 'string', description: 'One or two plain sentences addressed to the parent.' },
      actionRequired: { type: 'boolean', description: 'True if the parent needs to do something, attend something, or pay for something.' },
      events: {
        type: 'array',
        description: 'Every distinct date, deadline, or event mentioned — each gets its own entry. A single email can list several unrelated ones (e.g. a Seesaw digest mentioning Book Week, a disco, and an excursion all in one message) — split those into separate entries rather than merging them. Empty array if the message has no specific date anywhere.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Short label for this specific event/deadline, e.g. "Book Week costume", "Disco", "Bunnings visit". A few words, not a full sentence.' },
            date: { type: 'string', description: 'The actual calendar date this refers to, as YYYY-MM-DD, resolved relative to the email\'s own date (given below) — NOT relative to today.' },
          },
          required: ['label', 'date'],
        },
      },
      senderLabel: { type: 'string', description: 'Best guess at who originally sent this — the school app, club, or organisation name (e.g. "Seesaw", "QKR", a school or club name). If this looks like a forwarded email, read the original sender from the forwarded header block ("From: ...") rather than whoever forwarded it. Short, a few words.' },
    },
    required: ['title', 'summary', 'actionRequired', 'events', 'senderLabel'],
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  if (WEBHOOK_BASIC_AUTH) {
    const expected = 'Basic ' + Buffer.from(WEBHOOK_BASIC_AUTH).toString('base64');
    if (req.headers.authorization !== expected) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  }

  try {
    const payload = req.body || {};
    const fromEmail = (payload.FromFull && payload.FromFull.Email) || payload.From || '';
    const subject = payload.Subject || '';
    const rawBody = (payload.TextBody || stripHtml(payload.HtmlBody || '')).trim().slice(0, 6000);
    const providerMessageId = payload.MessageID || null;
    const emailDate = parseEmailDate(payload.Date);

    if (!rawBody) {
      res.status(200).json({ skipped: 'empty body' });
      return;
    }

    const extracted = await extractWithClaude(subject, rawBody, emailDate);
    const channelInfo = await matchChannel(fromEmail, extracted.senderLabel);

    // Generated up front (rather than left to the DB default) so we know the
    // id to attach events to even before the insert response comes back.
    const messageId = randomUUID();

    const inserted = await supabaseInsertMessage({
      id: messageId,
      provider_message_id: providerMessageId,
      channel: channelInfo.channel,
      hue: channelInfo.hue,
      from_email: fromEmail,
      subject,
      raw_body: rawBody,
      title: extracted.title,
      summary: extracted.summary,
      action_required: extracted.actionRequired,
      sender_label: extracted.senderLabel,
    });

    if (inserted.length === 0) {
      // A duplicate webhook retry (same provider_message_id) — the message
      // already exists, so don't insert its events a second time either.
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }

    if (Array.isArray(extracted.events) && extracted.events.length > 0) {
      await supabaseInsertEvents(extracted.events.map(ev => ({
        message_id: messageId,
        label: ev.label,
        event_date: ev.date,
      })));
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[inbound] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

function parseEmailDate(raw) {
  const d = raw ? new Date(raw) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}

async function matchChannel(fromEmail, senderLabel) {
  // Manually forwarded (and even auto-forwarded) email rewrites the envelope
  // From to the forwarder's own address, so the original sender is checked
  // too — Claude reads it out of the forwarded header block in the body.
  const haystack = `${fromEmail || ''} ${senderLabel || ''}`.toLowerCase();
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/channel_senders?select=match_pattern,channel,hue`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const rows = resp.ok ? await resp.json() : [];
  const hit = rows.find(r => haystack.includes(r.match_pattern.toLowerCase()));
  return hit ? { channel: hit.channel, hue: hit.hue } : { channel: 'Unknown', hue: 0 };
}

async function extractWithClaude(subject, body, emailDate) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_message' },
      messages: [{
        role: 'user',
        content: `This is a forwarded email a parent received, possibly with forwarding headers or quoted text mixed in — extract only the substance. This email's own date is ${emailDate.toISOString().slice(0, 10)} — resolve any relative dates in the content ("this Friday", "next week") against that date, not against today.\n\nSubject: ${subject}\n\nBody:\n${body}`,
      }],
    }),
  });
  const data = await resp.json();
  const toolUse = (data.content || []).find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return structured output: ' + JSON.stringify(data));
  return toolUse.input;
}

async function supabaseInsertMessage(row) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/messages?on_conflict=provider_message_id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      // return=representation so we can tell a real insert (row back) apart
      // from a skipped duplicate (empty array back) — ignore-duplicates
      // alone doesn't distinguish the two in the response status.
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!resp.ok) {
    throw new Error(`Supabase message insert failed: ${resp.status} ${await resp.text()}`);
  }
  return resp.json();
}

async function supabaseInsertEvents(rows) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/message_events`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) {
    throw new Error(`Supabase events insert failed: ${resp.status} ${await resp.text()}`);
  }
}
