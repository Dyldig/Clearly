// GET  /api/profile -> { displayName, autoAddCalendar }
// POST /api/profile {displayName?, autoAddCalendar?} -> updates whichever
//      field(s) are present, leaving the other untouched.
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;

  try {
    if (req.method === 'GET') {
      const resp = await supabase('profiles?user_id=eq.sarah&select=display_name,auto_add_calendar');
      if (!resp.ok) throw new Error(`Supabase read failed: ${resp.status} ${await resp.text()}`);
      const rows = await resp.json();
      const row = rows[0];
      res.status(200).json({
        displayName: row ? row.display_name : 'Sarah',
        autoAddCalendar: row ? row.auto_add_calendar : false,
      });
      return;
    }

    if (req.method === 'POST') {
      const { displayName, autoAddCalendar } = req.body || {};
      const patch = { user_id: 'sarah', updated_at: new Date().toISOString() };

      if (displayName !== undefined) {
        const trimmed = (displayName || '').trim();
        if (!trimmed) { res.status(400).json({ error: 'displayName required' }); return; }
        if (trimmed.length > 40) { res.status(400).json({ error: 'displayName too long' }); return; }
        patch.display_name = trimmed;
      }
      if (autoAddCalendar !== undefined) {
        if (typeof autoAddCalendar !== 'boolean') { res.status(400).json({ error: 'autoAddCalendar must be boolean' }); return; }
        patch.auto_add_calendar = autoAddCalendar;
      }
      if (!patch.display_name && patch.auto_add_calendar === undefined) { res.status(400).json({ error: 'nothing to update' }); return; }

      const resp = await supabase('profiles?on_conflict=user_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!resp.ok) throw new Error(`Supabase upsert failed: ${resp.status} ${await resp.text()}`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('[profile] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
