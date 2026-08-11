// POST /api/events {id, addedToCalendar} -> patch one event's calendar state
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;

  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method not allowed' });
      return;
    }

    const { id, addedToCalendar } = req.body || {};
    if (!id) { res.status(400).json({ error: 'id required' }); return; }
    if (typeof addedToCalendar !== 'boolean') { res.status(400).json({ error: 'nothing to update' }); return; }

    const resp = await supabase(`message_events?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ added_to_calendar: addedToCalendar }),
    });
    if (!resp.ok) throw new Error(`Supabase update failed: ${resp.status} ${await resp.text()}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[events] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
