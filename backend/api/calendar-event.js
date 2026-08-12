// POST   /api/calendar-event {eventId} -> creates a real event in the
//        user's Outlook calendar via Microsoft Graph, and marks it added.
// DELETE /api/calendar-event {eventId} -> deletes the real event from
//        Outlook (if one was ever created for it) and clears the added flag.
// Combined into one file to stay under Vercel's Hobby-plan serverless
// function count limit — was calendar-add-event.js + calendar-remove-event.js.
const { guard, supabase } = require('./_lib');
const { getValidAccessToken } = require('./_microsoft');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;

  try {
    if (req.method === 'POST') {
      const { eventId } = req.body || {};
      if (!eventId) { res.status(400).json({ error: 'eventId required' }); return; }

      const evResp = await supabase(`message_events?id=eq.${encodeURIComponent(eventId)}&select=id,label,event_date`);
      if (!evResp.ok) throw new Error(`Supabase read failed: ${evResp.status} ${await evResp.text()}`);
      const [event] = await evResp.json();
      if (!event) { res.status(404).json({ error: 'event not found' }); return; }

      let accessToken;
      try {
        accessToken = await getValidAccessToken(supabase);
      } catch (err) {
        if (err.message === 'not_connected') { res.status(409).json({ error: 'calendar_not_connected' }); return; }
        throw err;
      }

      const graphResp = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          subject: event.label,
          isAllDay: true,
          start: { dateTime: `${event.event_date}T00:00:00`, timeZone: 'UTC' },
          end: { dateTime: `${addOneDay(event.event_date)}T00:00:00`, timeZone: 'UTC' },
        }),
      });
      if (!graphResp.ok) throw new Error(`Graph create event failed: ${graphResp.status} ${await graphResp.text()}`);
      const created = await graphResp.json();

      const patchResp = await supabase(`message_events?id=eq.${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ added_to_calendar: true, graph_event_id: created.id }),
      });
      if (!patchResp.ok) throw new Error(`Supabase update failed: ${patchResp.status} ${await patchResp.text()}`);

      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const { eventId } = req.body || {};
      if (!eventId) { res.status(400).json({ error: 'eventId required' }); return; }

      const evResp = await supabase(`message_events?id=eq.${encodeURIComponent(eventId)}&select=id,graph_event_id`);
      if (!evResp.ok) throw new Error(`Supabase read failed: ${evResp.status} ${await evResp.text()}`);
      const [event] = await evResp.json();
      if (!event) { res.status(404).json({ error: 'event not found' }); return; }

      if (event.graph_event_id) {
        const accessToken = await getValidAccessToken(supabase);
        const delResp = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(event.graph_event_id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!delResp.ok && delResp.status !== 404) {
          throw new Error(`Graph delete event failed: ${delResp.status} ${await delResp.text()}`);
        }
      }

      const patchResp = await supabase(`message_events?id=eq.${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ added_to_calendar: false, graph_event_id: null }),
      });
      if (!patchResp.ok) throw new Error(`Supabase update failed: ${patchResp.status} ${await patchResp.text()}`);

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('[calendar-event] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};

function addOneDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
