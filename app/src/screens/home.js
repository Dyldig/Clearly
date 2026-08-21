import { el, svg } from '../dom.js';
import { mapItem } from '../selectors.js';
import { CALENDAR_COLOR, chipStyle } from '../colors.js';
import { parseEventDate } from '../dates.js';
import { makeSwipeable } from '../swipe.js';

const FILTER_ICON = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 5.5h14M6 10h8M9 14.5h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
const TRASH_ICON = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 5.5h14M7.5 5.5V4a1.5 1.5 0 011.5-1.5h2A1.5 1.5 0 0112.5 4v1.5M8 9v6M12 9v6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 5.5l.7 10a2 2 0 002 1.9h5.6a2 2 0 002-1.9l.7-10" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHECK_ICON = `<svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M3.5 10.5l4 4 9-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ATTENTION_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'action', label: 'Needs attention' },
  { key: 'fyi', label: 'Awareness' },
];

export function renderHome(state, actions) {
  const { filters } = state;
  // state.items already arrives newest-first from the backend. Marking a
  // message read (via the checkmark button, or by opening it) is how you
  // dismiss it from Home without deleting it — it still exists everywhere
  // else (Digest, the calendar), just not cluttering this list.
  const unreadItems = state.items.filter(i => !i.read);
  const allActionItems = unreadItems.filter(i => i.actionRequired);
  const allFyiItems = unreadItems.filter(i => !i.actionRequired);

  const showActionSection = filters.attention !== 'fyi';
  const showFyiSection = filters.attention !== 'action';

  const actionItems = showActionSection
    ? allActionItems.filter(it => matchesFilters(it, filters)).map(i => mapItem(i, actions))
    : [];
  const fyiItems = showFyiSection
    ? allFyiItems.filter(it => matchesFilters(it, filters)).map(i => mapItem(i, actions))
    : [];

  const activeFilterCount = countActiveFilters(filters);
  const emptyMessage = unreadItems.length === 0
    ? (state.items.length === 0 ? 'No messages yet — forward an email to get started.' : "You're all caught up.")
    : 'Nothing matches these filters.';

  const nodes = [];

  if (state.calendarConnected) {
    const addedCount = state.items.reduce((sum, it) => sum + (it.events || []).filter(e => e.addedToCalendar).length, 0);
    nodes.push(el('div', { class: 'calendar-banner' }, [
      el('div', { class: 'calendar-banner-dot', style: { background: CALENDAR_COLOR } }),
      el('span', { class: 'calendar-banner-text' },
        addedCount > 0
          ? `${addedCount} ${addedCount === 1 ? 'event' : 'events'} synced with your Outlook Calendar`
          : 'Outlook Calendar connected — add a date from any message to sync it'),
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
        ? el('div', { class: 'row-list' }, actionItems.map(it => renderHomeRow(it, 'action', actions)))
        : el('div', { class: 'filter-empty' }, emptyMessage),
    );
  }

  if (showFyiSection) {
    nodes.push(
      el('div', { class: 'section-heading section-heading-fyi' }, [
        el('span', { class: 'section-label' }, 'For your awareness'),
      ]),
      fyiItems.length > 0
        ? el('div', { class: 'row-list' }, fyiItems.map(it => renderHomeRow(it, 'fyi', actions)))
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

function renderHomeRow(it, kind, actions) {
  const isAction = kind === 'action';
  const row = el('div', {
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
      el('div', { class: 'home-row-right' }, [
        isAction ? el('span', { class: 'home-row-date' }, it.dateLabel) : null,
        el('div', {
          class: 'mark-read-btn',
          title: 'Mark as read',
          onClick: (e) => { e.stopPropagation(); actions.markRead(it.id); },
        }, svg(CHECK_ICON)),
      ]),
    ]),
    el('div', { class: `home-row-title home-row-title-${kind}`, style: { fontWeight: it.titleWeight } }, it.title),
  ]);
  makeSwipeable(row, () => actions.swipeDeleteItem(it.id));
  return el('div', { class: 'home-row-swipe-wrapper' }, [
    el('div', { class: 'swipe-delete-bg' }, [svg(TRASH_ICON), el('span', {}, 'Delete')]),
    row,
  ]);
}
