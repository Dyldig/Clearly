import { createInitialState, persistCalendarProvider } from './state.js';
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
  render();
}

const actions = {
  openItem: (id) => update(s => ({
    selectedItemId: id,
    expandedOriginal: false,
    items: s.items.map(it => it.id === id ? { ...it, read: true } : it),
  })),
  closeItem: () => update({ selectedItemId: null }),
  goHome: () => update({ activeTab: 'home', selectedItemId: null }),
  goDigest: () => update({ activeTab: 'digest', selectedItemId: null }),
  goChannels: () => update({ activeTab: 'channels', selectedItemId: null }),
  toggleExpandOriginal: () => update(s => ({ expandedOriginal: !s.expandedOriginal })),
  toggleCalendar: () => update(s => ({
    items: s.items.map(it => it.id === s.selectedItemId ? { ...it, addedToCalendar: !it.addedToCalendar } : it),
  })),
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

  setCalendarProvider: (v) => {
    persistCalendarProvider(v);
    update({ calendarProvider: v });
  },
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
  if (state.activeTab === 'home') return renderHome(state, actions);
  if (state.activeTab === 'digest') return renderDigest(state, actions);
  return renderChannels(state, actions);
}

render();
