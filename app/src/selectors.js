import { chipStyle } from './colors.js';
import { formatEventDate } from './dates.js';

function readVisuals(read) {
  return {
    rowBg: read ? 'oklch(0.995 0.004 70)' : 'oklch(0.955 0.025 35)',
    rowOpacity: read ? 0.72 : 1,
    dotVisible: !read,
    titleWeight: read ? 500 : 650,
  };
}

// Summarizes a message's events into a single compact badge for Home's
// per-message row: the earliest date, plus a "+N" count when there's more
// than one (e.g. a Seesaw digest listing three unrelated dates).
function summarizeEvents(events) {
  if (!events || events.length === 0) return '';
  const label = formatEventDate(events[0].date);
  return events.length > 1 ? `${label} +${events.length - 1}` : label;
}

// The view-model for a Home row and the Month view's selected-day row — one
// entry per message, regardless of how many dates it contains.
export function mapItem(it, actions) {
  const { chipBg, chipColor } = chipStyle(it.hue);
  return {
    id: it.id,
    channel: it.channel,
    title: it.title,
    dateLabel: summarizeEvents(it.events),
    chipBg, chipColor,
    ...readVisuals(it.read),
    open: () => actions.openItem(it.id),
  };
}

// The view-model for a Digest row — one entry per *event*, not per message,
// since a single message can have several unrelated dates that each belong
// on their own day. Clicking any of them opens the parent message.
export function mapOccurrence(occurrence, actions) {
  const { message, event } = occurrence;
  const { chipBg, chipColor } = chipStyle(message.hue);
  return {
    id: event.id,
    channel: message.channel,
    title: event.label,
    dateLabel: formatEventDate(event.date),
    chipBg, chipColor,
    ...readVisuals(message.read),
    open: () => actions.openItem(message.id),
  };
}

// Flattens every message's events into (message, event) pairs for Digest's
// date-based views. Messages with no dated events simply have no occurrence
// and so don't appear anywhere in Digest — Home is still where they live.
export function allOccurrences(items) {
  const list = [];
  for (const it of items) {
    for (const event of it.events || []) {
      list.push({ message: it, event });
    }
  }
  return list;
}
