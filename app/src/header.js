import { el, svg } from './dom.js';
import { chipStyle } from './colors.js';
import { WEEKDAY_ABBR, MONTH_NAMES } from './dates.js';
import { weekRangeLabel } from './screens/digest.js';

const BACK_ARROW = `<svg width="10" height="17" viewBox="0 0 12 20" fill="none"><path d="M10 2L2 10l8 8" stroke="oklch(0.35 0.02 60)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const DIGEST_VIEWS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'workweek', label: 'Work wk' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export function renderHeader(state, actions) {
  if (state.selectedItemId) return renderDetailHeader(state, actions);
  if (state.activeTab === 'home') return renderHomeHeader();
  if (state.activeTab === 'digest') return renderDigestHeader(state, actions);
  if (state.activeTab === 'settings') return renderSettingsHeader();
  return renderChannelsHeader();
}

function renderDetailHeader(state, actions) {
  const it = state.items.find(i => i.id === state.selectedItemId);
  const { chipBg, chipColor } = chipStyle(it.hue);
  return el('div', { class: 'header header-detail' }, [
    el('div', { class: 'back-btn', onClick: actions.closeItem }, svg(BACK_ARROW)),
    el('div', { class: 'chip chip-detail-header', style: { color: chipColor, background: chipBg } }, it.channel),
  ]);
}

function renderHomeHeader() {
  const now = new Date();
  const todayLabel = `${WEEKDAY_ABBR[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()].slice(0, 3)}`;
  return el('div', { class: 'header header-home' }, [
    el('div', { class: 'brand-row' }, [
      el('div', { class: 'brand-left' }, [
        el('div', { class: 'brand-mark' }, el('div', { class: 'brand-dot' })),
        el('span', { class: 'brand-name' }, 'Clearly'),
      ]),
      el('span', { class: 'header-date' }, todayLabel),
    ]),
    el('h1', { class: 'home-greeting' }, 'Good morning, Sarah'),
    el('p', { class: 'home-tagline' }, "Everything that matters. Nothing that doesn't."),
  ]);
}

function renderDigestHeader(state, actions) {
  return el('div', { class: 'header header-digest' }, [
    el('span', { class: 'eyebrow' }, 'Weekly digest'),
    el('h1', { class: 'digest-title' }, weekRangeLabel()),
    el('p', { class: 'digest-subtitle' }, 'Organised by day, not by app.'),
    el('div', { class: 'view-pills' }, DIGEST_VIEWS.map(v => {
      const active = state.digestView === v.key;
      return el('div', {
        class: 'pill',
        style: { background: active ? 'oklch(0.62 0.15 35)' : 'transparent', color: active ? '#fff' : 'oklch(0.45 0.015 60)' },
        onClick: () => actions.setDigestView(v.key),
      }, v.label);
    })),
  ]);
}

function renderChannelsHeader() {
  return el('div', { class: 'header header-channels' }, [
    el('span', { class: 'eyebrow' }, 'Channels'),
    el('h1', { class: 'channels-title' }, 'Connected channels'),
    el('p', { class: 'channels-subtitle' }, 'Manage how each one reaches you.'),
  ]);
}

function renderSettingsHeader() {
  return el('div', { class: 'header header-channels' }, [
    el('span', { class: 'eyebrow' }, 'Settings'),
    el('h1', { class: 'channels-title' }, 'App settings'),
    el('p', { class: 'channels-subtitle' }, 'Calendar, notifications, and your account.'),
  ]);
}
