// POST /api/calendar-remove-event {eventId} -> deletes the real event from
// Outlook (if one was ever created for it) and clears the added flag.
const { guard, supabase } = require('./_lib');
const { getValidAccessToken } = require('./_microsoft');

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }

  try {
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
  } catch (err) {
    console.error('[calendar-remove-event] failed:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
};
