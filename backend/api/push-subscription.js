// POST   /api/push-subscription {endpoint, keys, notifyActionOnly} -> upsert
// DELETE /api/push-subscription {endpoint}                         -> remove
// Combined into one file to stay under Vercel's Hobby-plan serverless
// function count limit — was push-subscribe.js + push-unsubscribe.js.
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;

  try {
    if (req.method === 'POST') {
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
      return;
    }

    if (req.method === 'DELETE') {
      const { endpoint } = req.body || {};
      if (!endpoint) { res.status(400).json({ error: 'endpoint required' }); return; }

      const resp = await supabase(`push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      if (!resp.ok) throw new Error(`Supabase delete failed: ${resp.status} ${await resp.text()}`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('[push-subscription] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
