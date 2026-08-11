import { el, svg } from '../dom.js';
import { mapItem } from '../selectors.js';
import { PROVIDER_META, chipStyle } from '../colors.js';
import { parseEventDate } from '../dates.js';

const FILTER_ICON = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 5.5h14M6 10h8M9 14.5h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;

const ATTENTION_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'action', label: 'Needs attention' },
  { key: 'fyi', label: 'Awareness' },
];

export function renderHome(state, actions) {
  const { filters } = state;
  // state.items already arrives newest-first from the backend.
  const allActionItems = state.items.filter(i => i.actionRequired);
  const allFyiItems = state.items.filter(i => !i.actionRequired);

  const showActionSection = filters.attention !== 'fyi';
  const showFyiSection = filters.attention !== 'action';

  const actionItems = showActionSection
    ? allActionItems.filter(it => matchesFilters(it, filters)).map(i => mapItem(i, actions))
    : [];
  const fyiItems = showFyiSection
    ? allFyiItems.filter(it => matchesFilters(it, filters)).map(i => mapItem(i, actions))
    : [];

  const providerMeta = PROVIDER_META[state.calendarProvider];
  const activeFilterCount = countActiveFilters(filters);
  const emptyMessage = state.items.length === 0
    ? 'No messages yet — forward an email to get started.'
    : 'Nothing matches these filters.';

  const nodes = [];

  if (providerMeta) {
    nodes.push(el('div', { class: 'calendar-banner' }, [
      el('div', { class: 'calendar-banner-dot', style: { background: providerMeta.color } }),
      el('span', { class: 'calendar-banner-text' },
        `${allActionItems.length} upcoming ${allActionItems.length === 1 ? 'event' : 'events'} synced with your ${providerMeta.label}`),
    ]));
  }

  nodes.push(renderFilterBar(state, actions, activeFilterCount));
  if (state.filtersOpen) nodes.push(renderFilterPanel(state, actions));

  if (showActionSection) {
    nodes.push(
      el('div', { class: 'section-heading' }, [
        el('span', { class: 'section-label' }, 'Needs your attention'),
        el('span', { class: 'count-badge' }, String(actionItems.length)),
      ]),
      actionItems.length > 0
        ? el('div', { class: 'row-list' }, actionItems.map(it => renderHomeRow(it, 'action')))
        : el('div', { class: 'filter-empty' }, emptyMessage),
    );
  }

  if (showFyiSection) {
    nodes.push(
      el('div', { class: 'section-heading section-heading-fyi' }, [
        el('span', { class: 'section-label' }, 'For your awareness'),
      ]),
      fyiItems.length > 0
        ? el('div', { class: 'row-list' }, fyiItems.map(it => renderHomeRow(it, 'fyi')))
        : el('div', { class: 'filter-empty' }, emptyMessage),
    );
  }

  nodes.push(el('div', { class: 'spacer-12' }));

  return el('div', {}, nodes);
}

// A message matches a date-range filter if ANY of its events falls in
// range. Messages with no dated events (pure FYI, nothing to schedule)
// don't match once a date filter is active — there's no date to compare.
function matchesFilters(it, filters) {
  if (filters.channels.length > 0 && !filters.channels.includes(it.channel)) return false;
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T00:00:00`) : null;
    const hasMatch = (it.events || []).some(ev => {
      const d = parseEventDate(ev.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    if (!hasMatch) return false;
  }
  return true;
}

function countActiveFilters(filters) {
  let n = 0;
  if (filters.channels.length > 0) n++;
  if (filters.attention !== 'all') n++;
  if (filters.dateFrom || filters.dateTo) n++;
  return n;
}

function channelOptions(items) {
  const seen = new Set();
  const opts = [];
  for (const it of items) {
    if (!seen.has(it.channel)) { seen.add(it.channel); opts.push({ name: it.channel, hue: it.hue }); }
  }
  return opts;
}

function renderFilterBar(state, actions, activeCount) {
  return el('div', { class: 'filter-bar' }, [
    el('div', {
      class: `filter-toggle${state.filtersOpen ? ' filter-toggle-open' : ''}`,
      onClick: actions.toggleFilters,
    }, [
      svg(FILTER_ICON),
      el('span', {}, 'Filters'),
      activeCount > 0 ? el('span', { class: 'filter-count-badge' }, String(activeCount)) : null,
    ]),
    activeCount > 0 ? el('span', { class: 'filter-clear', onClick: actions.clearFilters }, 'Clear') : null,
  ]);
}

function renderFilterPanel(state, actions) {
  const { filters } = state;
  const options = channelOptions(state.items);

  return el('div', { class: 'filter-panel' }, [
    el('div', { class: 'filter-group' }, [
      el('div', { class: 'filter-group-label' }, 'Channel'),
      el('div', { class: 'filter-chip-row' }, options.map(opt => renderChannelFilterChip(opt, filters, actions))),
    ]),
    el('div', { class: 'filter-group' }, [
      el('div', { class: 'filter-group-label' }, 'Type'),
      el('div', { class: 'filter-segmented' }, ATTENTION_OPTIONS.map(o => {
        const active = filters.attention === o.key;
        return el('div', {
          class: 'pill',
          style: { background: active ? 'oklch(0.62 0.15 35)' : 'transparent', color: active ? '#fff' : 'oklch(0.45 0.015 60)' },
          onClick: () => actions.setFilterAttention(o.key),
        }, o.label);
      })),
    ]),
    el('div', { class: 'filter-group' }, [
      el('div', { class: 'filter-group-label' }, 'Date range'),
      el('div', { class: 'filter-date-row' }, [
        el('input', {
          type: 'date', class: 'filter-date-input', value: filters.dateFrom,
          onChange: (e) => actions.setFilterDateFrom(e.target.value),
        }),
        el('span', { class: 'filter-date-sep' }, '–'),
        el('input', {
          type: 'date', class: 'filter-date-input', value: filters.dateTo,
          onChange: (e) => actions.setFilterDateTo(e.target.value),
        }),
      ]),
    ]),
  ]);
}

function renderChannelFilterChip(opt, filters, actions) {
  const { chipBg, chipColor } = chipStyle(opt.hue);
  const active = filters.channels.includes(opt.name);
  return el('div', {
    class: 'filter-channel-chip',
    style: active
      ? { background: chipBg, color: chipColor, borderColor: chipColor }
      : { background: 'transparent', color: 'oklch(0.5 0.015 60)', borderColor: 'oklch(0.85 0.008 60)' },
    onClick: () => actions.toggleFilterChannel(opt.name),
  }, opt.name);
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
