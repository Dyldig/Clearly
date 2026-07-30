import { el, svg } from './dom.js';

const ICONS = {
  home: (c) => `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M4 11.5L12 4l8 7.5" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  digest: (c) => `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="3" stroke="${c}" stroke-width="1.9"/><path d="M3.5 9.5H20.5" stroke="${c}" stroke-width="1.9"/><path d="M8 3V6.5M16 3V6.5" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  channels: (c) => `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" stroke="${c}" stroke-width="1.9"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" stroke="${c}" stroke-width="1.9"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" stroke="${c}" stroke-width="1.9"/><rect x="13" y="13" width="7.5" height="7.5" rx="2" stroke="${c}" stroke-width="1.9"/></svg>`,
};

const ACTIVE = 'oklch(0.55 0.15 35)';
const INACTIVE = 'oklch(0.68 0.01 60)';

export function renderTabBar(state, actions) {
  const colorFor = (tab) => state.activeTab === tab ? ACTIVE : INACTIVE;
  return el('div', { class: 'tabbar' }, [
    renderTab('home', 'Home', colorFor('home'), actions.goHome),
    renderTab('digest', 'Digest', colorFor('digest'), actions.goDigest),
    renderTab('channels', 'Channels', colorFor('channels'), actions.goChannels),
  ]);
}

function renderTab(key, label, color, onClick) {
  return el('div', { class: 'tab', onClick }, [
    svg(ICONS[key](color)),
    el('span', { class: 'tab-label', style: { color } }, label),
  ]);
}
