import { el, svg } from './dom.js';

const ICONS = {
  home: (c) => `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M4 11.5L12 4l8 7.5" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9h12v-9" stroke="${c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  digest: (c) => `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="3" stroke="${c}" stroke-width="1.9"/><path d="M3.5 9.5H20.5" stroke="${c}" stroke-width="1.9"/><path d="M8 3V6.5M16 3V6.5" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  channels: (c) => `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" stroke="${c}" stroke-width="1.9"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" stroke="${c}" stroke-width="1.9"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" stroke="${c}" stroke-width="1.9"/><rect x="13" y="13" width="7.5" height="7.5" rx="2" stroke="${c}" stroke-width="1.9"/></svg>`,
  settings: (c) => `<svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2.8" stroke="${c}" stroke-width="1.9"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.55 1.55M7.85 16.15L6.3 17.7M17.7 17.7l-1.55-1.55M7.85 7.85L6.3 6.3" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/></svg>`,
};

const ACTIVE = 'oklch(0.55 0.15 35)';
const INACTIVE = 'oklch(0.68 0.01 60)';

export function renderTabBar(state, actions) {
  const colorFor = (tab) => state.activeTab === tab ? ACTIVE : INACTIVE;
  return el('div', { class: 'tabbar' }, [
    renderTab('home', 'Home', colorFor('home'), actions.goHome),
    renderTab('digest', 'Digest', colorFor('digest'), actions.goDigest),
    renderTab('channels', 'Channels', colorFor('channels'), actions.goChannels),
    renderTab('settings', 'Settings', colorFor('settings'), actions.goSettings),
  ]);
}

function renderTab(key, label, color, onClick) {
  return el('div', { class: 'tab', onClick }, [
    svg(ICONS[key](color)),
    el('span', { class: 'tab-label', style: { color } }, label),
  ]);
}
