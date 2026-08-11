// Vercel serverless function (Node.js runtime). Receives Postmark's inbound
// email webhook, extracts a structured summary via Claude, and stores the
// result in Supabase. Deploy this by pointing a Vercel project's Root
// Directory at `backend/` — Vercel auto-detects files under `api/` as
// serverless functions, reachable at <deployment-url>/api/inbound.

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
      actionRequired: { type: 'boolean', description: 'True if the parent needs to do something or attend something.' },
      dateLabel: { type: ['string', 'null'], description: 'Short human label like "Due Fri" or "9:00am Sat", or null if there is no date or deadline.' },
    },
    required: ['title', 'summary', 'actionRequired', 'dateLabel'],
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
    const messageId = payload.MessageID || null;

    if (!rawBody) {
      res.status(200).json({ skipped: 'empty body' });
      return;
    }

    const [channelInfo, extracted] = await Promise.all([
      matchChannel(fromEmail),
      extractWithClaude(subject, rawBody),
    ]);

    await supabaseInsert({
      provider_message_id: messageId,
      channel: channelInfo.channel,
      hue: channelInfo.hue,
      from_email: fromEmail,
      subject,
      raw_body: rawBody,
      title: extracted.title,
      summary: extracted.summary,
      action_required: extracted.actionRequired,
      date_label: extracted.dateLabel,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[inbound] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

async function matchChannel(fromEmail) {
  const lower = (fromEmail || '').toLowerCase();
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/channel_senders?select=match_pattern,channel,hue`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const rows = resp.ok ? await resp.json() : [];
  const hit = rows.find(r => lower.includes(r.match_pattern.toLowerCase()));
  return hit ? { channel: hit.channel, hue: hit.hue } : { channel: 'Unknown', hue: 0 };
}

async function extractWithClaude(subject, body) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_message' },
      messages: [{
        role: 'user',
        content: `This is a forwarded email a parent received, possibly with forwarding headers or quoted text mixed in — extract only the substance. Subject: ${subject}\n\nBody:\n${body}`,
      }],
    }),
  });
  const data = await resp.json();
  const toolUse = (data.content || []).find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return structured output: ' + JSON.stringify(data));
  return toolUse.input;
}

async function supabaseInsert(row) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/messages?on_conflict=provider_message_id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify(row),
  });
  if (!resp.ok) {
    throw new Error(`Supabase insert failed: ${resp.status} ${await resp.text()}`);
  }
}
