import { CHANNELS } from './data.js';

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
  const channelOverrides = persisted.channels || {};
  const now = new Date();

  return {
    activeTab: 'home',
    selectedItemId: null,
    expandedOriginal: false,
    items: [],
    itemsLoading: true,
    itemsError: null,
    channels: CHANNELS.map(c => ({ ...c, ...channelOverrides[c.id] })),
    digestView: 'week',
    dayIndex: 0,
    monthCursor: { y: now.getFullYear(), m: now.getMonth() },
    yearCursor: now.getFullYear(),
    monthSelectedKey: null,
    calendarProvider: persisted.calendarProvider || 'google',
    filtersOpen: false,
    filters: persisted.filters || { channels: [], attention: 'all', dateFrom: '', dateTo: '' },
  };
}

// Message read/added-to-calendar state now lives server-side (see api.js) —
// only channel mute/priority, filters, and the calendar provider choice are
// still local-only, so only those persist here.
export function persistState(state) {
  const channels = {};
  for (const c of state.channels) channels[c.id] = { muted: c.muted, priority: c.priority };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      calendarProvider: state.calendarProvider,
      filters: state.filters,
      channels,
    }));
  } catch {
    // Storage unavailable (private browsing, quota) — fail silently.
  }
}
