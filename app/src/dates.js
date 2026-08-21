export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function sameDate(a, b) {
  return dateKey(a) === dateKey(b);
}

export function shortDate(d) {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}

// Parses a bare "YYYY-MM-DD" event_date as a local calendar date rather than
// UTC midnight, which would otherwise shift it a day earlier in negative-UTC
// timezones.
export function parseEventDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

export function formatEventDate(dateStr) {
  return shortDate(parseEventDate(dateStr));
}

// "09:00" -> "9am", "14:30" -> "2:30pm".
export function formatEventTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

// Combines a date and optional time into one label, e.g. "21 Aug" or
// "21 Aug · 9am".
export function formatEventDateTime(dateStr, timeStr) {
  const date = formatEventDate(dateStr);
  return timeStr ? `${date} · ${formatEventTime(timeStr)}` : date;
}
