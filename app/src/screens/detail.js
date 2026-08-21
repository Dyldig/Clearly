import { el, svg } from '../dom.js';
import { chipStyle } from '../colors.js';
import { formatEventDateTime } from '../dates.js';

const CAL_ICON = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4" width="15" height="13.5" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 8H17.5" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 2V5.5M13.5 2V5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

export function renderDetail(state, actions) {
  const it = state.items.find(i => i.id === state.selectedItemId);
  const { chipColor } = chipStyle(it.hue);

  const summaryCardBg = it.actionRequired ? 'oklch(0.965 0.015 35)' : 'oklch(0.97 0.008 200)';
  const expandLabel = state.expandedOriginal ? 'Hide original ‹' : 'Show original ›';
  const hasEvents = it.events && it.events.length > 0;

  return el('div', { class: 'detail' }, [
    el('div', { class: 'summary-card', style: { background: summaryCardBg } }, [
      el('div', { class: 'summary-eyebrow-row' }, [
        el('div', { class: 'summary-swatch', style: { background: chipColor } }),
        el('span', { class: 'summary-eyebrow' }, 'AI summary'),
      ]),
      el('p', { class: 'summary-text' }, it.summary),
    ]),
    hasEvents ? el('div', { class: 'action-card' }, [
      el('div', { class: 'action-label' }, it.actionRequired ? 'Action required' : 'Key dates'),
      ...it.events.map(ev => renderEventBlock(ev, state, actions)),
    ]) : null,
    el('div', { class: 'original-card', onClick: actions.toggleExpandOriginal }, [
      el('div', { class: 'original-header' }, [
        el('span', { class: 'original-label' }, 'Original message'),
        el('span', { class: 'original-toggle' }, expandLabel),
      ]),
      el('p', {
        class: state.expandedOriginal ? 'original-text-expanded' : 'original-text-collapsed',
      }, it.original),
    ]),
    el('div', {
      class: 'ignore-similar-link',
      onClick: () => actions.ignoreSimilarMessage(it.id),
    }, `Don't show me ${it.channel} messages like this again`),
  ]);
}

function renderEventBlock(event, state, actions) {
  // Without a connected calendar there's nowhere to actually add the event —
  // the button sends you to Settings to connect first, rather than silently
  // doing nothing or faking success.
  if (!state.calendarConnected) {
    return el('div', { class: 'action-event' }, [
      el('div', { class: 'action-event-heading' }, [
        el('span', { class: 'action-event-label' }, event.label),
        el('span', { class: 'action-event-date' }, formatEventDateTime(event.date, event.time)),
      ]),
      el('button', {
        class: 'cal-btn cal-btn-connect',
        onClick: actions.goSettings,
      }, [svg(CAL_ICON), 'Connect calendar to add']),
    ]);
  }

  const busy = state.calendarBusyEventId === event.id;
  const calBtnBg = event.addedToCalendar ? 'oklch(0.9 0.03 145)' : 'oklch(0.62 0.15 35)';
  const calBtnColor = event.addedToCalendar ? 'oklch(0.32 0.09 145)' : '#fff';
  const calBtnLabel = busy
    ? 'Working…'
    : event.addedToCalendar ? 'Added to Outlook ✓' : 'Add to Outlook Calendar';

  return el('div', { class: 'action-event' }, [
    el('div', { class: 'action-event-heading' }, [
      el('span', { class: 'action-event-label' }, event.label),
      el('span', { class: 'action-event-date' }, formatEventDateTime(event.date, event.time)),
    ]),
    el('button', {
      class: 'cal-btn',
      style: { background: calBtnBg, color: calBtnColor, opacity: busy ? 0.7 : 1 },
      onClick: busy ? null : () => actions.toggleEventCalendar(event.id),
    }, [svg(CAL_ICON), calBtnLabel]),
  ]);
}
