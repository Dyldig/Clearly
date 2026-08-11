import { el, svg } from '../dom.js';
import { chipStyle } from '../colors.js';

const STAR_ICON = (fill, stroke) =>
  `<svg width="15" height="15" viewBox="0 0 20 20" fill="${fill}"><path d="M10 1.5l2.6 5.5 6 0.8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-0.8L10 1.5z" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const PLUS_ICON = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M10 2.5V17.5M2.5 10H17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export function renderChannels(state, actions) {
  return el('div', { class: 'channels' }, [
    ...state.channels.map(c => renderChannelCard(c, actions)),
    el('div', { class: 'add-channel' }, [svg(PLUS_ICON), el('span', {}, 'Add new channel')]),
    el('div', { class: 'spacer-12' }),
  ]);
}

function renderChannelCard(c, actions) {
  const { chipBg, chipColor } = chipStyle(c.hue);
  const statusColor = c.status === 'connected' ? 'oklch(0.65 0.14 145)' : 'oklch(0.72 0.13 80)';
  const statusLabel = c.status === 'connected' ? 'Connected' : 'Syncing';
  return el('div', { class: 'channel-card' }, [
    el('div', { class: 'channel-top' }, [
      el('div', { class: 'channel-badge', style: { background: chipBg } }, el('span', { style: { color: chipColor } }, c.name[0])),
      el('div', { class: 'channel-info' }, [
        el('div', { class: 'channel-name' }, c.name),
        el('div', { class: 'channel-category' }, c.category),
      ]),
    ]),
    el('div', { class: 'channel-bottom' }, [
      el('div', { class: 'channel-status' }, [
        el('div', { class: 'status-dot', style: { background: statusColor } }),
        el('span', {}, `${statusLabel} · ${c.synced}`),
      ]),
      el('div', { class: 'channel-controls' }, [
        el('div', {
          class: 'priority-btn',
          style: { background: c.priority ? 'oklch(0.93 0.045 35)' : 'transparent' },
          onClick: () => actions.togglePriority(c.id),
        }, svg(STAR_ICON(c.priority ? 'oklch(0.62 0.15 35)' : 'none', c.priority ? 'oklch(0.62 0.15 35)' : 'oklch(0.65 0.01 60)'))),
        el('div', {
          class: 'mute-switch',
          style: { background: c.muted ? 'oklch(0.85 0.01 60)' : 'oklch(0.62 0.15 35)' },
          onClick: () => actions.toggleMute(c.id),
        }, el('div', { class: 'mute-knob', style: { left: c.muted ? '3px' : '21px' } })),
      ]),
    ]),
  ]);
}
