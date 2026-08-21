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
  const now = new Date();

  return {
    activeTab: 'home',
    selectedItemId: null,
    expandedOriginal: false,
    items: [],
    itemsLoading: true,
    itemsError: null,
    // Tracked senders (Channels screen) are fully server-side now — which
    // senders get synced is the actual privacy boundary for mail-sync, so
    // there's nothing meaningful to keep local-only here anymore.
    channelSenders: [],
    channelSendersLoading: true,
    addChannelFormOpen: false,
    digestView: 'week',
    dayIndex: 0,
    monthCursor: { y: now.getFullYear(), m: now.getMonth() },
    yearCursor: now.getFullYear(),
    monthSelectedKey: null,
    // Whether Outlook is actually connected is a server-side fact (OAuth
    // tokens live in Supabase), not a local preference — always re-checked
    // via /api/calendar-status on load rather than persisted here.
    calendarConnected: false,
    calendarChecking: true,
    calendarEmail: null,
    displayName: '',
    displayNameLoading: true,
    accountEditing: false,
    autoAddCalendar: false,
    autoAddCalendarBusy: false,
    // Push subscription state is read from the browser's own service-worker
    // registration on boot (see app.js), not persisted here.
    pushSupported: false,
    pushChecking: true,
    pushSubscribed: false,
    pushNotifyActionOnly: false,
    pushBusy: false,
    filtersOpen: false,
    filters: persisted.filters || { channels: [], attention: 'all', dateFrom: '', dateTo: '' },
  };
}

// Everything else (messages, channel senders, calendar connection) lives
// server-side now — only filters are still local-only, so that's all that
// needs persisting here.
export function persistState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ filters: state.filters }));
  } catch {
    // Storage unavailable (private browsing, quota) — fail silently.
  }
}
