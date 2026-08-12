import { createInitialState, persistState } from './state.js';
import {
  fetchMessages, updateMessage, deleteMessage,
  fetchCalendarStatus, addEventToCalendar, removeEventFromCalendar, disconnectCalendar as disconnectCalendarApi,
} from './api.js';
import { el } from './dom.js';
import { showToast } from './toast.js';
import { attachPullToRefresh } from './pulltorefresh.js';
import { renderHeader } from './header.js';
import { renderTabBar } from './tabbar.js';
import { renderHome } from './screens/home.js';
import { renderDigest } from './screens/digest.js';
import { renderChannels } from './screens/channels.js';
import { renderSettings } from './screens/settings.js';
import { renderDetail } from './screens/detail.js';

const state = createInitialState();

// Swiped-away messages waiting out their Undo window before the delete is
// actually sent to the server. Ephemeral, not part of the reactive state.
const pendingDeletes = new Map();

const headerEl = document.getElementById('header');
const contentEl = document.getElementById('content');
const tabbarEl = document.getElementById('tabbar');

function update(patch) {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  persistState(state);
  render();
}

// Fetches the latest messages and drops anything already read — pulling to
// refresh both syncs new mail in and clears out what you've already dealt
// with, rather than just re-fetching the same list.
function refreshMessages() {
  const previousIds = new Set(state.items.map(it => it.id));
  return fetchMessages()
    .then(items => {
      const visible = items.filter(it => !it.read);
      const newCount = visible.filter(it => !previousIds.has(it.id)).length;
      update({ items: visible });
      showToast(newCount > 0 ? `${newCount} new ${newCount === 1 ? 'message' : 'messages'}` : 'No new messages');
    })
    .catch(err => {
      console.error('[refresh] failed:', err);
      showToast("Couldn't refresh — check your connection");
    });
}

const actions = {
  openItem: (id) => {
    update(s => ({
      selectedItemId: id,
      expandedOriginal: false,
      items: s.items.map(it => it.id === id ? { ...it, read: true } : it),
    }));
    updateMessage(id, { read: true }).catch(err => console.error('[openItem] sync failed:', err));
  },
  closeItem: () => update({ selectedItemId: null }),
  goHome: () => update({ activeTab: 'home', selectedItemId: null }),
  goDigest: () => update({ activeTab: 'digest', selectedItemId: null }),
  goChannels: () => update({ activeTab: 'channels', selectedItemId: null }),
  goSettings: () => update({ activeTab: 'settings', selectedItemId: null }),
  toggleExpandOriginal: () => update(s => ({ expandedOriginal: !s.expandedOriginal })),
  toggleEventCalendar: (eventId) => {
    if (state.calendarBusyEventId) return; // one in flight at a time
    const message = state.items.find(it => it.id === state.selectedItemId);
    const event = message && message.events.find(e => e.id === eventId);
    if (!event) return;
    const adding = !event.addedToCalendar;

    update({ calendarBusyEventId: eventId });
    const call = adding ? addEventToCalendar(eventId) : removeEventFromCalendar(eventId);
    call
      .then(() => {
        update(s => ({
          calendarBusyEventId: null,
          items: s.items.map(it => it.id === message.id
            ? { ...it, events: it.events.map(e => e.id === eventId ? { ...e, addedToCalendar: adding } : e) }
            : it),
        }));
      })
      .catch(err => {
        console.error('[toggleEventCalendar] failed:', err);
        update({ calendarBusyEventId: null });
        showToast(adding ? "Couldn't add to calendar — try again" : "Couldn't remove from calendar — try again");
      });
  },
  disconnectCalendar: () => {
    disconnectCalendarApi()
      .then(() => {
        update({ calendarConnected: false });
        showToast('Calendar disconnected');
      })
      .catch(err => {
        console.error('[disconnectCalendar] failed:', err);
        showToast("Couldn't disconnect — try again");
      });
  },
  swipeDeleteItem: (id) => {
    const item = state.items.find(it => it.id === id);
    if (!item) return;
    update(s => ({ items: s.items.filter(it => it.id !== id) }));

    const timer = setTimeout(() => {
      pendingDeletes.delete(id);
      deleteMessage(id).catch(err => console.error('[delete] sync failed:', err));
    }, 4500);
    pendingDeletes.set(id, { item, timer });

    showToast('Message deleted', {
      actionLabel: 'Undo',
      duration: 4500,
      onAction: () => {
        const pending = pendingDeletes.get(id);
        if (!pending) return;
        clearTimeout(pending.timer);
        pendingDeletes.delete(id);
        update(s => ({ items: [pending.item, ...s.items] }));
      },
    });
  },
  togglePriority: (id) => update(s => ({ channels: s.channels.map(c => c.id === id ? { ...c, priority: !c.priority } : c) })),
  toggleMute: (id) => update(s => ({ channels: s.channels.map(c => c.id === id ? { ...c, muted: !c.muted } : c) })),

  setDigestView: (v) => update({ digestView: v, monthSelectedKey: null }),
  dayPrev: () => update(s => ({ dayIndex: Math.max(0, s.dayIndex - 1) })),
  dayNext: () => update(s => ({ dayIndex: Math.min(6, s.dayIndex + 1) })),
  monthPrev: () => update(s => {
    const m = s.monthCursor.m - 1;
    return m < 0
      ? { monthCursor: { y: s.monthCursor.y - 1, m: 11 }, monthSelectedKey: null }
      : { monthCursor: { y: s.monthCursor.y, m }, monthSelectedKey: null };
  }),
  monthNext: () => update(s => {
    const m = s.monthCursor.m + 1;
    return m > 11
      ? { monthCursor: { y: s.monthCursor.y + 1, m: 0 }, monthSelectedKey: null }
      : { monthCursor: { y: s.monthCursor.y, m }, monthSelectedKey: null };
  }),
  yearPrev: () => update(s => ({ yearCursor: s.yearCursor - 1 })),
  yearNext: () => update(s => ({ yearCursor: s.yearCursor + 1 })),
  selectMonthDay: (key) => update(s => ({ monthSelectedKey: s.monthSelectedKey === key ? null : key })),
  jumpToMonth: (y, m) => update({ activeTab: 'digest', digestView: 'month', monthCursor: { y, m }, monthSelectedKey: null }),

  toggleFilters: () => update(s => ({ filtersOpen: !s.filtersOpen })),
  toggleFilterChannel: (channel) => update(s => {
    const has = s.filters.channels.includes(channel);
    const channels = has ? s.filters.channels.filter(c => c !== channel) : [...s.filters.channels, channel];
    return { filters: { ...s.filters, channels } };
  }),
  setFilterAttention: (v) => update(s => ({ filters: { ...s.filters, attention: v } })),
  setFilterDateFrom: (v) => update(s => ({ filters: { ...s.filters, dateFrom: v } })),
  setFilterDateTo: (v) => update(s => ({ filters: { ...s.filters, dateTo: v } })),
  clearFilters: () => update({ filters: { channels: [], attention: 'all', dateFrom: '', dateTo: '' } }),
};

function render() {
  const showDetail = !!state.selectedItemId;
  headerEl.replaceChildren(renderHeader(state, actions));
  contentEl.replaceChildren(renderContentBody());
  if (showDetail) tabbarEl.replaceChildren();
  else tabbarEl.replaceChildren(renderTabBar(state, actions));
}

function renderContentBody() {
  if (state.selectedItemId) return renderDetail(state, actions);
  if (state.activeTab === 'channels') return renderChannels(state, actions);
  if (state.activeTab === 'settings') return renderSettings(state, actions);
  if (state.itemsLoading) return el('div', { class: 'state-message' }, 'Loading your messages…');
  if (state.itemsError) return el('div', { class: 'state-message state-message-error' }, `Couldn't load messages: ${state.itemsError}`);
  if (state.activeTab === 'home') return renderHome(state, actions);
  return renderDigest(state, actions);
}

// If we just landed back here from the Microsoft OAuth redirect, surface
// that and land on Settings — the actual connected/not-connected fact still
// comes from fetchCalendarStatus() below, this is just the toast + tab.
function handleOAuthReturn() {
  const params = new URLSearchParams(window.location.search);
  const calendarParam = params.get('calendar');
  if (!calendarParam) return;

  params.delete('calendar');
  const query = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);

  update({ activeTab: 'settings' });
  showToast(calendarParam === 'connected' ? 'Outlook Calendar connected' : "Couldn't connect your calendar — try again");
}

render();
attachPullToRefresh(contentEl, refreshMessages);
handleOAuthReturn();

fetchMessages()
  .then(items => update({ items, itemsLoading: false }))
  .catch(err => {
    console.error('[bootstrap] failed to load messages:', err);
    update({ itemsLoading: false, itemsError: String(err && err.message || err) });
  });

fetchCalendarStatus()
  .then(({ connected }) => update({ calendarConnected: connected, calendarChecking: false }))
  .catch(err => {
    console.error('[bootstrap] failed to load calendar status:', err);
    update({ calendarChecking: false });
  });
