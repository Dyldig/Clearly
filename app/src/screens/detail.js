import { el, svg } from '../dom.js';
import { chipStyle, PROVIDER_META } from '../colors.js';
import { formatEventDate } from '../dates.js';

const CAL_ICON = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4" width="15" height="13.5" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 8H17.5" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 2V5.5M13.5 2V5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

export function renderDetail(state, actions) {
  const it = state.items.find(i => i.id === state.selectedItemId);
  const { chipColor } = chipStyle(it.hue);
  const providerMeta = PROVIDER_META[state.calendarProvider];
  const providerLabel = providerMeta ? providerMeta.label : 'Calendar';

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
      ...it.events.map(ev => renderEventBlock(ev, providerLabel, actions)),
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
  ]);
}

function renderEventBlock(event, providerLabel, actions) {
  const calBtnBg = event.addedToCalendar ? 'oklch(0.9 0.03 145)' : 'oklch(0.62 0.15 35)';
  const calBtnColor = event.addedToCalendar ? 'oklch(0.32 0.09 145)' : '#fff';
  const calBtnLabel = event.addedToCalendar ? `Added to ${providerLabel} ✓` : `Add to ${providerLabel}`;

  return el('div', { class: 'action-event' }, [
    el('div', { class: 'action-event-heading' }, [
      el('span', { class: 'action-event-label' }, event.label),
      el('span', { class: 'action-event-date' }, formatEventDate(event.date)),
    ]),
    el('button', {
      class: 'cal-btn',
      style: { background: calBtnBg, color: calBtnColor },
      onClick: () => actions.toggleEventCalendar(event.id),
    }, [svg(CAL_ICON), calBtnLabel]),
  ]);
}
