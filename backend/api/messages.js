// GET    /api/messages       -> list all messages (with their events), shaped for the frontend
// POST   /api/messages {id, read?} -> patch one message's read state
// DELETE /api/messages {id}  -> delete one message (cascades to its events)
const { guard, supabase } = require('./_lib');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;

  try {
    if (req.method === 'GET') {
      const resp = await supabase(
        'messages?select=id,channel,hue,title,summary,raw_body,action_required,read,created_at,' +
        'message_events(id,label,event_date,added_to_calendar)&order=created_at.desc'
      );
      if (!resp.ok) throw new Error(`Supabase read failed: ${resp.status} ${await resp.text()}`);
      const rows = await resp.json();
      res.status(200).json(rows.map(toItem));
      return;
    }

    if (req.method === 'POST') {
      const { id, read } = req.body || {};
      if (!id) { res.status(400).json({ error: 'id required' }); return; }
      if (typeof read !== 'boolean') { res.status(400).json({ error: 'nothing to update' }); return; }

      const resp = await supabase(`messages?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ read }),
      });
      if (!resp.ok) throw new Error(`Supabase update failed: ${resp.status} ${await resp.text()}`);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) { res.status(400).json({ error: 'id required' }); return; }

      const resp = await supabase(`messages?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      if (!resp.ok) throw new Error(`Supabase delete failed: ${resp.status} ${await resp.text()}`);
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
  const events = (row.message_events || [])
    .map(e => ({ id: e.id, label: e.label, date: e.event_date, addedToCalendar: e.added_to_calendar }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return {
    id: row.id,
    channel: row.channel,
    hue: row.hue,
    title: row.title,
    summary: row.summary,
    original: row.raw_body,
    actionRequired: row.action_required,
    read: row.read,
    createdAt: row.created_at,
    events,
  };
}
