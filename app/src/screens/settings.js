import { el, svg } from '../dom.js';

const CAL_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4" width="15" height="13.5" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 8H17.5" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 2V5.5M13.5 2V5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const MAIL_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 5.5l7 5.5 7-5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BELL_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 2.5c-2.5 0-4.2 2-4.2 4.5v2.8c0 .6-.2 1.1-.6 1.6l-1 1.2c-.5.6-.1 1.4.6 1.4h11.6c.7 0 1.1-.8.6-1.4l-1-1.2c-.4-.5-.6-1-.6-1.6V7c0-2.5-1.7-4.5-4.2-4.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.3 16a1.8 1.8 0 003.4 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const PERSON_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="6.5" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 17c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

const CALENDAR_PROVIDERS = [
  { key: 'none', label: 'None' },
  { key: 'google', label: 'Google' },
  { key: 'outlook', label: 'Outlook' },
];

export function renderSettings(state, actions) {
  return el('div', { class: 'settings' }, [
    renderCalendarSyncCard(state, actions),
    renderInfoCard(MAIL_ICON, 'Email sync', 'Forward any school or club email to your Clearly address to have it summarised automatically.'),
    renderComingSoonCard(BELL_ICON, 'Notifications', "Push alerts aren't set up yet — you'll be able to choose what notifies you and when, from here."),
    renderComingSoonCard(PERSON_ICON, 'Account', 'Sarah · single-user for now. Sign-in and multiple profiles are coming later.'),
    el('div', { class: 'spacer-12' }),
  ]);
}

function renderCalendarSyncCard(state, actions) {
  return el('div', { class: 'channel-card' }, [
    el('div', { class: 'channel-top' }, [
      el('div', { class: 'channel-badge calendar-sync-badge' }, svg(CAL_ICON)),
      el('div', { class: 'channel-info' }, [
        el('div', { class: 'channel-name' }, 'Calendar sync'),
        el('div', { class: 'channel-category' }, 'Show upcoming events on your linked calendar'),
      ]),
    ]),
    el('div', { class: 'calendar-sync-pills' }, CALENDAR_PROVIDERS.map(p => {
      const active = state.calendarProvider === p.key;
      return el('div', {
        class: 'pill',
        style: { background: active ? 'oklch(0.62 0.15 35)' : 'transparent', color: active ? '#fff' : 'oklch(0.45 0.015 60)' },
        onClick: () => actions.setCalendarProvider(p.key),
      }, p.label);
    })),
  ]);
}

function renderInfoCard(icon, title, description) {
  return el('div', { class: 'channel-card' }, [
    el('div', { class: 'channel-top' }, [
      el('div', { class: 'channel-badge settings-badge-neutral' }, svg(icon)),
      el('div', { class: 'channel-info' }, [
        el('div', { class: 'channel-name' }, title),
        el('div', { class: 'channel-category' }, description),
      ]),
    ]),
  ]);
}

function renderComingSoonCard(icon, title, description) {
  return el('div', { class: 'channel-card settings-card-disabled' }, [
    el('div', { class: 'channel-top' }, [
      el('div', { class: 'channel-badge settings-badge-neutral' }, svg(icon)),
      el('div', { class: 'channel-info' }, [
        el('div', { class: 'settings-card-title-row' }, [
          el('div', { class: 'channel-name' }, title),
          el('span', { class: 'coming-soon-badge' }, 'Coming soon'),
        ]),
        el('div', { class: 'channel-category' }, description),
      ]),
    ]),
  ]);
}
