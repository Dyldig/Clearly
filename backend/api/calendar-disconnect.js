// POST /api/calendar-disconnect -> forgets the stored Microsoft tokens.
// Doesn't touch already-created calendar events or reset added_to_calendar
// flags — disconnecting is about the connection, not undoing past actions.
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }

  try {
    const resp = await supabase('calendar_connections?user_id=eq.sarah&provider=eq.microsoft', {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
    if (!resp.ok) throw new Error(`Supabase delete failed: ${resp.status} ${await resp.text()}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[calendar-disconnect] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
