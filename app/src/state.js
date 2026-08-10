import { ITEMS, CHANNELS } from './data.js';

const STORAGE_KEY = 'clearly.state';

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function createInitialState() {
  const persisted = loadPersisted();
  const itemOverrides = persisted.items || {};
  const channelOverrides = persisted.channels || {};

  return {
    activeTab: 'home',
    selectedItemId: null,
    expandedOriginal: false,
    items: ITEMS.map(it => ({ ...it, addedToCalendar: false, ...itemOverrides[it.id] })),
    channels: CHANNELS.map(c => ({ ...c, ...channelOverrides[c.id] })),
    digestView: 'week',
    dayIndex: 0,
    monthCursor: { y: 2026, m: 7 },
    yearCursor: 2026,
    monthSelectedKey: null,
    calendarProvider: persisted.calendarProvider || 'google',
    filtersOpen: false,
    filters: persisted.filters || { channels: [], attention: 'all', dateFrom: '', dateTo: '' },
  };
}

// Persists only what a returning user would expect to still be true: read
// state, calendar-added state, mute/priority, filters, and the calendar
// provider choice. Navigation position (active tab, open item, digest view)
// is intentionally left out so a refresh lands back on a clean Home view.
export function persistState(state) {
  const items = {};
  for (const it of state.items) items[it.id] = { read: it.read, addedToCalendar: it.addedToCalendar };
  const channels = {};
  for (const c of state.channels) channels[c.id] = { muted: c.muted, priority: c.priority };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      calendarProvider: state.calendarProvider,
      filters: state.filters,
      items,
      channels,
    }));
  } catch {
    // Storage unavailable (private browsing, quota) — fail silently.
  }
}
