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
