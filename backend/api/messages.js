// GET  /api/messages        -> list all messages, shaped for the frontend
// POST /api/messages {id, read?, addedToCalendar?} -> patch one message
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;

  try {
    if (req.method === 'GET') {
      const resp = await supabase(
        'messages?select=id,channel,hue,title,summary,raw_body,action_required,date_label,event_date,read,added_to_calendar,created_at&order=created_at.desc'
      );
      if (!resp.ok) throw new Error(`Supabase read failed: ${resp.status} ${await resp.text()}`);
      const rows = await resp.json();
      res.status(200).json(rows.map(toItem));
      return;
    }

    if (req.method === 'POST') {
      const { id, read, addedToCalendar } = req.body || {};
      if (!id) { res.status(400).json({ error: 'id required' }); return; }

      const patch = {};
      if (typeof read === 'boolean') patch.read = read;
      if (typeof addedToCalendar === 'boolean') patch.added_to_calendar = addedToCalendar;
      if (Object.keys(patch).length === 0) { res.status(400).json({ error: 'nothing to update' }); return; }

      const resp = await supabase(`messages?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!resp.ok) throw new Error(`Supabase update failed: ${resp.status} ${await resp.text()}`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('[messages] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};

function toItem(row) {
  return {
    id: row.id,
    channel: row.channel,
    hue: row.hue,
    title: row.title,
    summary: row.summary,
    original: row.raw_body,
    dateLabel: row.date_label,
    actionRequired: row.action_required,
    read: row.read,
    addedToCalendar: row.added_to_calendar,
    date: row.event_date || row.created_at,
  };
}
