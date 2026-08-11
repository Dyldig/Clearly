import { createInitialState, persistState } from './state.js';
import { fetchMessages, updateMessage, updateEvent } from './api.js';
import { el } from './dom.js';
import { renderHeader } from './header.js';
import { renderTabBar } from './tabbar.js';
import { renderHome } from './screens/home.js';
import { renderDigest } from './screens/digest.js';
import { renderChannels } from './screens/channels.js';
import { renderDetail } from './screens/detail.js';

const state = createInitialState();

const headerEl = document.getElementById('header');
const contentEl = document.getElementById('content');
const tabbarEl = document.getElementById('tabbar');

function update(patch) {
  Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
  persistState(state);
  render();
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
  toggleExpandOriginal: () => update(s => ({ expandedOriginal: !s.expandedOriginal })),
  toggleEventCalendar: (eventId) => {
    const message = state.items.find(it => it.id === state.selectedItemId);
    const event = message && message.events.find(e => e.id === eventId);
    if (!event) return;
    const nextValue = !event.addedToCalendar;
    update(s => ({
      items: s.items.map(it => it.id === s.selectedItemId
        ? { ...it, events: it.events.map(e => e.id === eventId ? { ...e, addedToCalendar: nextValue } : e) }
        : it),
    }));
    updateEvent(eventId, { addedToCalendar: nextValue }).catch(err => console.error('[toggleEventCalendar] sync failed:', err));
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

  setCalendarProvider: (v) => update({ calendarProvider: v }),

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
  if (state.itemsLoading) return el('div', { class: 'state-message' }, 'Loading your messages…');
  if (state.itemsError) return el('div', { class: 'state-message state-message-error' }, `Couldn't load messages: ${state.itemsError}`);
  if (state.activeTab === 'home') return renderHome(state, actions);
  return renderDigest(state, actions);
}

render();

fetchMessages()
  .then(items => update({ items, itemsLoading: false }))
  .catch(err => {
    console.error('[bootstrap] failed to load messages:', err);
    update({ itemsLoading: false, itemsError: String(err && err.message || err) });
  });
