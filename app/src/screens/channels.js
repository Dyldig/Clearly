import { el, svg } from '../dom.js';
import { chipStyle } from '../colors.js';

const PLUS_ICON = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M10 2.5V17.5M2.5 10H17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const TRASH_ICON = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 5.5h14M7.5 5.5V4a1.5 1.5 0 011.5-1.5h2A1.5 1.5 0 0112.5 4v1.5M8 9v6M12 9v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 5.5l.7 10a2 2 0 002 1.9h5.6a2 2 0 002-1.9l.7-10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function renderChannels(state, actions) {
  if (state.channelSendersLoading) {
    return el('div', { class: 'state-message' }, 'Loading channels…');
  }

  return el('div', { class: 'channels' }, [
    state.channelSenders.length === 0 && !state.addChannelFormOpen
      ? el('div', { class: 'state-message' }, 'No channels tracked yet — add one below to start syncing its emails automatically.')
      : null,
    ...state.channelSenders.map(c => renderChannelCard(c, actions)),
    state.addChannelFormOpen ? renderAddChannelForm(actions) : renderAddChannelButton(actions),
    el('div', { class: 'spacer-12' }),
  ]);
}

function renderAddChannelButton(actions) {
  return el('div', { class: 'add-channel', onClick: actions.openAddChannelForm }, [
    svg(PLUS_ICON),
    el('span', {}, 'Add new channel'),
  ]);
}

function renderAddChannelForm(actions) {
  return el('div', { class: 'filter-panel' }, [
    el('div', { class: 'filter-group' }, [
      el('div', { class: 'filter-group-label' }, 'Sender email or domain'),
      el('input', { type: 'text', id: 'new-sender-pattern', class: 'text-input', placeholder: 'e.g. seesaw.me' }),
    ]),
    el('div', { class: 'filter-group' }, [
      el('div', { class: 'filter-group-label' }, 'Channel name'),
      el('input', { type: 'text', id: 'new-sender-channel', class: 'text-input', placeholder: 'e.g. Seesaw' }),
    ]),
    el('div', { class: 'add-channel-form-actions' }, [
      el('button', { class: 'settings-connect-btn settings-disconnect-btn', onClick: actions.closeAddChannelForm }, 'Cancel'),
      el('button', { class: 'settings-connect-btn', onClick: actions.submitAddChannelForm }, 'Add channel'),
    ]),
  ]);
}

function renderChannelCard(c, actions) {
  const { chipBg, chipColor } = chipStyle(c.hue);
  return el('div', { class: 'channel-card', style: { opacity: c.muted ? 0.65 : 1 } }, [
    el('div', { class: 'channel-top' }, [
      el('div', { class: 'channel-badge', style: { background: chipBg } }, el('span', { style: { color: chipColor } }, c.channel[0].toUpperCase())),
      el('div', { class: 'channel-info' }, [
        el('div', { class: 'channel-name' }, c.channel),
        el('div', { class: 'channel-category' }, `Matches "${c.matchPattern}"`),
      ]),
      el('div', { class: 'channel-delete-btn', onClick: () => actions.deleteChannelSender(c.id) }, svg(TRASH_ICON)),
    ]),
    el('div', { class: 'channel-bottom' }, [
      el('span', { class: 'channel-mute-status' }, c.muted ? 'Paused' : 'Syncing every 10 min'),
      el('div', {
        class: 'mute-switch',
        style: { background: c.muted ? 'oklch(0.85 0.01 60)' : 'oklch(0.62 0.15 35)' },
        onClick: () => actions.toggleChannelSenderMute(c.id),
      }, el('div', { class: 'mute-knob', style: { left: c.muted ? '3px' : '21px' } })),
    ]),
  ]);
}
