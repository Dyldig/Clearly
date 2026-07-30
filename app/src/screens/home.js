import { el } from '../dom.js';
import { mapItem } from '../selectors.js';
import { PROVIDER_META } from '../colors.js';

export function renderHome(state, actions) {
  const actionItems = state.items
    .filter(i => i.actionRequired)
    .sort((a, b) => a.order - b.order)
    .map(i => mapItem(i, actions));
  const fyiItems = state.items
    .filter(i => !i.actionRequired)
    .sort((a, b) => a.order - b.order)
    .map(i => mapItem(i, actions));
  const providerMeta = PROVIDER_META[state.calendarProvider];

  const nodes = [];

  if (providerMeta) {
    nodes.push(el('div', { class: 'calendar-banner' }, [
      el('div', { class: 'calendar-banner-dot', style: { background: providerMeta.color } }),
      el('span', { class: 'calendar-banner-text' },
        `${actionItems.length} upcoming ${actionItems.length === 1 ? 'event' : 'events'} synced with your ${providerMeta.label}`),
    ]));
  }

  nodes.push(
    el('div', { class: 'section-heading' }, [
      el('span', { class: 'section-label' }, 'Needs your attention'),
      el('span', { class: 'count-badge' }, String(actionItems.length)),
    ]),
    el('div', { class: 'row-list' }, actionItems.map(it => renderHomeRow(it, 'action'))),
    el('div', { class: 'section-heading section-heading-fyi' }, [
      el('span', { class: 'section-label' }, 'For your awareness'),
    ]),
    el('div', { class: 'row-list' }, fyiItems.map(it => renderHomeRow(it, 'fyi'))),
    el('div', { class: 'spacer-12' }),
  );

  return el('div', {}, nodes);
}

function renderHomeRow(it, kind) {
  const isAction = kind === 'action';
  return el('div', {
    class: `home-row home-row-${kind}`,
    style: { background: it.rowBg, opacity: isAction ? 1 : it.rowOpacity },
    onClick: it.open,
  }, [
    el('div', { class: 'home-row-top' }, [
      el('div', { class: 'home-row-left' }, [
        el('div', {
          class: `home-row-dot home-row-dot-${kind}`,
          style: { visibility: it.dotVisible ? 'visible' : 'hidden' },
        }),
        el('span', { class: `chip chip-${kind}`, style: { color: it.chipColor, background: it.chipBg } }, it.channel),
      ]),
      isAction ? el('span', { class: 'home-row-date' }, it.dateLabel) : null,
    ]),
    el('div', { class: `home-row-title home-row-title-${kind}`, style: { fontWeight: it.titleWeight } }, it.title),
  ]);
}
