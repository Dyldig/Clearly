// POST /api/mail-sync — triggered on a schedule (see .github/workflows/
// mail-sync.yml), not by the browser. Checks the connected Outlook inbox for
// recent mail from allow-listed senders (channel_senders) and runs anything
// new through the same extraction pipeline the forwarding path uses.
const { supabase } = require('./_lib');
const { getValidAccessToken } = require('./_microsoft');
const { ingestEmail, stripHtml } = require('./_ingest');

const MAIL_SYNC_SECRET = process.env.MAIL_SYNC_SECRET;
const LOOKBACK_HOURS = 24;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!MAIL_SYNC_SECRET || req.headers.authorization !== `Bearer ${MAIL_SYNC_SECRET}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const sendersResp = await supabase('channel_senders?muted=eq.false&select=match_pattern,channel,hue');
    if (!sendersResp.ok) throw new Error(`Supabase read failed: ${sendersResp.status} ${await sendersResp.text()}`);
    const senders = await sendersResp.json();
    if (senders.length === 0) {
      res.status(200).json({ ok: true, note: 'no tracked senders configured' });
      return;
    }

    let accessToken;
    try {
      accessToken = await getValidAccessToken(supabase);
    } catch (err) {
      if (err.message === 'not_connected') {
        res.status(200).json({ ok: true, note: 'calendar not connected' });
        return;
      }
      throw err;
    }

    const messages = await fetchRecentInboxMessages(accessToken);

    let matched = 0, ingested = 0, duplicates = 0, skipped = 0;
    for (const msg of messages) {
      const fromEmail = (msg.from && msg.from.emailAddress && msg.from.emailAddress.address) || '';
      if (!matchesAnySender(fromEmail, senders)) continue;
      matched++;

      const rawBody = msg.body && msg.body.contentType === 'html' ? stripHtml(msg.body.content || '') : (msg.body && msg.body.content) || '';
      const emailDate = msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date();

      const result = await ingestEmail({
        fromEmail,
        subject: msg.subject || '',
        rawBody,
        providerMessageId: `graph:${msg.id}`,
        emailDate,
      });
      if (result.duplicate) duplicates++;
      else if (result.ok) ingested++;
      else skipped++;
    }

    res.status(200).json({ ok: true, checked: messages.length, matched, ingested, duplicates, skipped });
  } catch (err) {
    console.error('[mail-sync] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};

function matchesAnySender(fromEmail, senders) {
  const lower = (fromEmail || '').toLowerCase();
  return senders.some(s => lower.includes(s.match_pattern.toLowerCase()));
}

async function fetchRecentInboxMessages(accessToken) {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    $select: 'id,subject,from,receivedDateTime,body',
    $filter: `receivedDateTime ge ${since}`,
    $orderby: 'receivedDateTime desc',
    $top: '50',
  });
  const resp = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Graph list messages failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  return data.value || [];
}
