// POST /api/push-unsubscribe { endpoint }
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }

  try {
    const { endpoint } = req.body || {};
    if (!endpoint) { res.status(400).json({ error: 'endpoint required' }); return; }

    const resp = await supabase(`push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
    if (!resp.ok) throw new Error(`Supabase delete failed: ${resp.status} ${await resp.text()}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[push-unsubscribe] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
