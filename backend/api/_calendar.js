// Shared Microsoft Graph event creation — used both by the manual "Add to
// Outlook Calendar" button (calendar-event.js) and the auto-add pipeline
// (_ingest.js, when the auto_add_calendar preference is on). Underscore-
// prefixed — not treated as a route by Vercel.
const { getValidAccessToken } = require('./_microsoft');

// Timed events need a real timezone (unlike all-day ones, where it doesn't
// matter) — hardcoded rather than per-user configurable since this is a
// single-user app for now.
const EVENT_TIME_ZONE = 'Australia/Sydney';

function addOneDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function addOneHour(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Creates a real Graph event for a message_events row ({label, event_date,
// event_time}) and returns the created event's Graph id. Timed (1 hour,
// default duration since emails rarely state an end time) if event_time is
// set, otherwise a whole-day event.
async function createGraphEvent(supabase, event) {
  const accessToken = await getValidAccessToken(supabase);

  const headers = { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
  let body;
  if (event.event_time) {
    // Postgres round-trips a `time` column as HH:MM:SS regardless of how it
    // was inserted — normalize to HH:MM before building datetime strings.
    const time = event.event_time.slice(0, 5);
    headers.Prefer = `outlook.timezone="${EVENT_TIME_ZONE}"`;
    body = {
      subject: event.label,
      isAllDay: false,
      start: { dateTime: `${event.event_date}T${time}:00`, timeZone: EVENT_TIME_ZONE },
      end: { dateTime: `${event.event_date}T${addOneHour(time)}:00`, timeZone: EVENT_TIME_ZONE },
    };
  } else {
    body = {
      subject: event.label,
      isAllDay: true,
      start: { dateTime: `${event.event_date}T00:00:00`, timeZone: 'UTC' },
      end: { dateTime: `${addOneDay(event.event_date)}T00:00:00`, timeZone: 'UTC' },
    };
  }

  const resp = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Graph create event failed: ${resp.status} ${await resp.text()}`);
  const created = await resp.json();
  return created.id;
}

module.exports = { createGraphEvent };
