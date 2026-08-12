// GET /api/calendar-status -> { connected: boolean }
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'GET') { res.status(405).json({ error: 'method not allowed' }); return; }

  try {
    const resp = await supabase('calendar_connections?user_id=eq.sarah&provider=eq.microsoft&select=id');
    if (!resp.ok) throw new Error(`Supabase read failed: ${resp.status} ${await resp.text()}`);
    const rows = await resp.json();
    res.status(200).json({ connected: rows.length > 0 });
  } catch (err) {
    console.error('[calendar-status] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
