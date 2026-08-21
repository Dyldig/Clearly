// Shared email → structured-message pipeline, used by both the Postmark
// webhook (inbound.js) and the Outlook polling sync (mail-sync.js). Each
// caller is responsible for pulling fromEmail/subject/rawBody/emailDate out
// of its own source's shape; this owns everything from there on.
const { randomUUID } = require('crypto');
const { notifyNewMessage } = require('./_push');
const { supabase: supabaseFetch } = require('./_lib');
const { createGraphEvent } = require('./_calendar');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EXTRACT_TOOL = {
  name: 'extract_message',
  description: 'Extract structured fields from a forwarded parent-communication email.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short title, under 8 words.' },
      summary: { type: 'string', description: 'One or two plain sentences addressed to the parent.' },
      actionRequired: {
        type: 'boolean',
        description: 'True only if the PARENT personally needs to do something specific: reply, pay, sign/return a form, send an item, book a slot, or physically attend/drop off/pick up something on a particular day. ' +
          'False for pure information, even if it describes an event — a newsletter mentioning "assembly is on Friday" is awareness (false) unless parents are asked to attend, bring something, or RSVP. ' +
          'False for routine automated notices with nothing to do right now (e.g. "your statement is ready to view", a payment that already went through, a newsletter recap). ' +
          'Examples of TRUE: "return the permission slip by Friday", "pay the excursion fee", "sign up for a parent-teacher slot", "your child needs a costume for Book Week". ' +
          'Examples of FALSE: "here\'s what happened in class this week", "the canteen menu has changed", "your statement is ready", "assembly is 9am Friday" (no ask of the parent).',
      },
      events: {
        type: 'array',
        description: 'Every distinct date, deadline, or event mentioned — each gets its own entry. A single email can list several unrelated ones (e.g. a Seesaw digest mentioning Book Week, a disco, and an excursion all in one message) — split those into separate entries rather than merging them. Empty array if the message has no specific date anywhere.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Short label for this specific event/deadline, e.g. "Book Week costume", "Disco", "Bunnings visit". A few words, not a full sentence.' },
            date: { type: 'string', description: 'The actual calendar date this refers to, as YYYY-MM-DD, resolved relative to the email\'s own date (given below) — NOT relative to today.' },
            time: { type: 'string', description: 'A specific clock time this event starts at, as 24-hour HH:MM (e.g. "09:00", "14:30") — ONLY if the email states one (e.g. "assembly at 9am"). Omit this field entirely if no specific time is mentioned; do not guess one.' },
          },
          required: ['label', 'date'],
        },
      },
      senderLabel: { type: 'string', description: 'Best guess at who originally sent this — the school app, club, or organisation name (e.g. "Seesaw", "QKR", a school or club name). If this looks like a forwarded email, read the original sender from the forwarded header block ("From: ...") rather than whoever forwarded it. Short, a few words.' },
    },
    required: ['title', 'summary', 'actionRequired', 'events', 'senderLabel'],
  },
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
        content: `This is an email a parent received, possibly with forwarding headers or quoted text mixed in — extract only the substance. This email's own date is ${emailDate.toISOString().slice(0, 10)} — resolve any relative dates in the content ("this Friday", "next week") against that date, not against today.\n\nSubject: ${subject}\n\nBody:\n${body}`,
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
      // return=representation so auto-add-to-calendar (below) has the
      // inserted ids to work with, without a second round-trip.
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) {
    throw new Error(`Supabase events insert failed: ${resp.status} ${await resp.text()}`);
  }
  return resp.json();
}

function normalizeTitle(title) {
  return (title || '').trim().toLowerCase();
}

// A simple case-insensitive containment check both ways, so minor wording
// drift ("Your statement is ready" vs "Your statement is now ready") still
// matches a saved "ignore this" rule.
async function matchesIgnoredPattern(channel, title) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/ignored_patterns?channel=eq.${encodeURIComponent(channel)}&select=pattern`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!resp.ok) return false;
  const rows = await resp.json();
  const normalized = normalizeTitle(title);
  return rows.some(r => normalized.includes(r.pattern) || r.pattern.includes(normalized));
}

// Fire-and-forget — a calendar failure should never fail ingestion. Only
// runs when the user has turned on "auto-add to calendar" in Settings.
async function autoAddEventsToCalendar(events) {
  try {
    const profResp = await supabaseFetch('profiles?user_id=eq.sarah&select=auto_add_calendar');
    if (!profResp.ok) return;
    const [profile] = await profResp.json();
    if (!profile || !profile.auto_add_calendar) return;

    for (const ev of events) {
      try {
        const graphEventId = await createGraphEvent(supabaseFetch, ev);
        await supabaseFetch(`message_events?id=eq.${ev.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ added_to_calendar: true, graph_event_id: graphEventId }),
        });
      } catch (err) {
        if (err.message !== 'not_connected') console.error('[autoAddEventsToCalendar] event failed:', ev.id, err.message);
      }
    }
  } catch (err) {
    console.error('[autoAddEventsToCalendar] failed:', err);
  }
}

// The single entry point both ingestion sources call once they've pulled
// fromEmail/subject/rawBody/providerMessageId/emailDate out of their own
// payload shape. Returns { skipped } | { duplicate: true } | { ok: true, messageId }.
async function ingestEmail({ fromEmail, subject, rawBody, providerMessageId, emailDate }) {
  const cleanBody = (rawBody || '').trim().slice(0, 6000);
  if (!cleanBody) return { skipped: 'empty body' };

  const extracted = await extractWithClaude(subject || '', cleanBody, emailDate);
  const channelInfo = await matchChannel(fromEmail, extracted.senderLabel);

  if (await matchesIgnoredPattern(channelInfo.channel, extracted.title)) {
    return { skipped: 'ignored pattern' };
  }

  const messageId = randomUUID();

  const inserted = await supabaseInsertMessage({
    id: messageId,
    provider_message_id: providerMessageId,
    channel: channelInfo.channel,
    hue: channelInfo.hue,
    from_email: fromEmail,
    subject: subject || '',
    raw_body: cleanBody,
    title: extracted.title,
    summary: extracted.summary,
    action_required: extracted.actionRequired,
    sender_label: extracted.senderLabel,
  });

  if (inserted.length === 0) {
    // Duplicate (same provider_message_id already stored) — don't insert
    // its events a second time either.
    return { duplicate: true };
  }

  if (Array.isArray(extracted.events) && extracted.events.length > 0) {
    const insertedEvents = await supabaseInsertEvents(extracted.events.map(ev => ({
      message_id: messageId,
      label: ev.label,
      event_date: ev.date,
      event_time: ev.time || null,
    })));
    autoAddEventsToCalendar(insertedEvents).catch(err => console.error('[ingestEmail] auto-add failed:', err));
  }

  // Fire-and-forget — a push failure should never fail ingestion.
  notifyNewMessage({
    title: extracted.title,
    summary: extracted.summary,
    actionRequired: extracted.actionRequired,
    channel: channelInfo.channel,
  }).catch(err => console.error('[ingestEmail] notify failed:', err));

  return { ok: true, messageId };
}

module.exports = { ingestEmail, stripHtml, parseEmailDate };
