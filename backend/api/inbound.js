// Vercel serverless function (Node.js runtime). Receives Postmark's inbound
// email webhook and runs it through the shared ingest pipeline (_ingest.js).
const { ingestEmail, stripHtml, parseEmailDate } = require('./_ingest');

const WEBHOOK_BASIC_AUTH = process.env.WEBHOOK_BASIC_AUTH; // "user:password" — must match Postmark's inbound stream auth

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
    const rawBody = payload.TextBody || stripHtml(payload.HtmlBody || '');
    const providerMessageId = payload.MessageID || null;
    const emailDate = parseEmailDate(payload.Date);

    const result = await ingestEmail({ fromEmail, subject, rawBody, providerMessageId, emailDate });
    res.status(200).json(result);
  } catch (err) {
    console.error('[inbound] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
