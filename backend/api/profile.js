// GET  /api/profile           -> { displayName }
// POST /api/profile {displayName} -> updates it
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;

  try {
    if (req.method === 'GET') {
      const resp = await supabase('profiles?user_id=eq.sarah&select=display_name');
      if (!resp.ok) throw new Error(`Supabase read failed: ${resp.status} ${await resp.text()}`);
      const rows = await resp.json();
      res.status(200).json({ displayName: rows.length > 0 ? rows[0].display_name : 'Sarah' });
      return;
    }

    if (req.method === 'POST') {
      const { displayName } = req.body || {};
      const trimmed = (displayName || '').trim();
      if (!trimmed) { res.status(400).json({ error: 'displayName required' }); return; }
      if (trimmed.length > 40) { res.status(400).json({ error: 'displayName too long' }); return; }

      const resp = await supabase('profiles?on_conflict=user_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: 'sarah', display_name: trimmed, updated_at: new Date().toISOString() }),
      });
      if (!resp.ok) throw new Error(`Supabase upsert failed: ${resp.status} ${await resp.text()}`);
      res.status(200).json({ ok: true, displayName: trimmed });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('[profile] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
