// POST /api/push-subscribe { endpoint, keys: {p256dh, auth}, notifyActionOnly }
// Upserts by endpoint — resubscribing the same browser just updates in place.
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }

  try {
    const { endpoint, keys, notifyActionOnly } = req.body || {};
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      res.status(400).json({ error: 'endpoint and keys required' });
      return;
    }

    const resp = await supabase('push_subscriptions?on_conflict=endpoint', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        notify_action_only: !!notifyActionOnly,
      }),
    });
    if (!resp.ok) throw new Error(`Supabase upsert failed: ${resp.status} ${await resp.text()}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[push-subscribe] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
