import { el, svg } from '../dom.js';
import { mapItem } from '../selectors.js';
import { MONTH_NAMES, WEEKDAY_NAMES, WEEKDAY_ABBR, startOfDay, addDays, dateKey, sameDate } from '../dates.js';

const CHEV_LEFT = `<svg width="8" height="14" viewBox="0 0 12 20" fill="none"><path d="M10 2L2 10l8 8" stroke="oklch(0.35 0.02 60)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHEV_RIGHT = `<svg width="8" height="14" viewBox="0 0 12 20" fill="none"><path d="M2 2l8 8-8 8" stroke="oklch(0.35 0.02 60)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function renderDigest(state, actions) {
  switch (state.digestView) {
    case 'day': return renderDay(state, actions);
    case 'workweek': return renderWeek(state, actions, true);
    case 'month': return renderMonth(state, actions);
    case 'year': return renderYear(state, actions);
    default: return renderWeek(state, actions, false);
  }
}

// Builds a real 7-day window starting today, and buckets real messages into
// it by comparing each message's actual received date.
export function computeWeekDays(state, actions) {
  const today = startOfDay(new Date());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : WEEKDAY_NAMES[d.getDay()];
    const sub = i <= 1
      ? `${WEEKDAY_ABBR[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`
      : `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
    const dayItems = state.items.filter(it => sameDate(new Date(it.date), d));
    const action = dayItems.filter(i => i.actionRequired).map(i => mapItem(i, actions));
    const fyi = dayItems.filter(i => !i.actionRequired).map(i => mapItem(i, actions));
    days.push({
      label, sub, action, fyi,
      hasAction: action.length > 0, hasFyi: fyi.length > 0, noItems: dayItems.length === 0,
    });
  }
  return days;
}

export function weekRangeLabel() {
  const today = startOfDay(new Date());
  const end = addDays(today, 6);
  const start = `${today.getDate()} ${MONTH_NAMES[today.getMonth()].slice(0, 3)}`;
  const stop = `${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)}`;
  return `Week of ${start} – ${stop}`;
}

function renderDay(state, actions) {
  const weekDays = computeWeekDays(state, actions);
  const dayIndex = state.dayIndex;
  const day = weekDays[dayIndex];
  return el('div', { class: 'digest-day' }, [
    el('div', { class: 'day-nav' }, [
      el('div', { class: 'nav-circle', style: { opacity: dayIndex === 0 ? 0.35 : 1 }, onClick: actions.dayPrev }, svg(CHEV_LEFT)),
      el('div', { class: 'day-nav-center' }, [
        el('div', { class: 'day-nav-label' }, day.label),
        el('div', { class: 'day-nav-sub' }, day.sub),
      ]),
      el('div', { class: 'nav-circle', style: { opacity: dayIndex === 6 ? 0.35 : 1 }, onClick: actions.dayNext }, svg(CHEV_RIGHT)),
    ]),
    day.hasAction ? el('div', { class: 'list-rows list-rows-gap-day' }, day.action.map(it => renderListRow(it, 'action', 'day'))) : null,
    day.hasFyi ? el('div', { class: 'list-rows' }, day.fyi.map(it => renderListRow(it, 'fyi', 'day'))) : null,
    day.noItems ? el('div', { class: 'empty-day' }, 'Nothing on for this day.') : null,
  ]);
}

function renderWeek(state, actions, workweekOnly) {
  let weekDays = computeWeekDays(state, actions);
  if (workweekOnly) weekDays = weekDays.filter((d, i) => i !== 2 && i !== 3);
  return el('div', { class: 'digest-week' }, [
    ...weekDays.map(day => el('div', { class: 'week-day-block' }, [
      el('div', { class: 'week-day-heading' }, [
        el('span', { class: 'week-day-label' }, day.label),
        el('span', { class: 'week-day-sub' }, day.sub),
      ]),
      day.hasAction ? el('div', { class: 'list-rows list-rows-gap-week' }, day.action.map(it => renderListRow(it, 'action', 'week'))) : null,
      day.hasFyi ? el('div', { class: 'list-rows' }, day.fyi.map(it => renderListRow(it, 'fyi', 'week'))) : null,
    ])),
    el('div', { class: 'spacer-8' }),
  ]);
}

function renderListRow(it, kind, size) {
  const isAction = kind === 'action';
  return el('div', { class: `list-row list-row-${kind} list-row-${size}`, onClick: it.open }, [
    el('div', { class: 'list-row-left' }, [
      el('div', { class: `list-row-title list-row-title-${kind} list-row-${size}` }, it.title),
      el('div', { class: 'list-row-channel', style: isAction ? { color: it.chipColor } : {} }, it.channel),
    ]),
    isAction
      ? el('span', { class: 'list-row-date' }, it.dateLabel)
      : el('span', { class: 'list-row-fyi-label' }, 'FYI'),
  ]);
}

function renderMonth(state, actions) {
  const { monthCursor } = state;
  const monthLabel = `${MONTH_NAMES[monthCursor.m]} ${monthCursor.y}`;
  const first = new Date(monthCursor.y, monthCursor.m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(monthCursor.y, monthCursor.m + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const today = startOfDay(new Date());

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(monthCursor.y, monthCursor.m, i - startWeekday + 1);
    const inMonth = cellDate.getMonth() === monthCursor.m;
    const key = dateKey(cellDate);
    const dayItems = state.items.filter(it => sameDate(new Date(it.date), cellDate));
    cells.push({
      key, num: cellDate.getDate(), inMonth,
      hasAction: dayItems.some(x => x.actionRequired),
      hasFyi: dayItems.some(x => !x.actionRequired),
      isToday: sameDate(cellDate, today),
      selected: state.monthSelectedKey === key,
      clickable: dayItems.length > 0,
    });
  }

  const selectedDayItems = state.monthSelectedKey
    ? state.items.filter(it => dateKey(new Date(it.date)) === state.monthSelectedKey).map(i => mapItem(i, actions))
    : [];

  return el('div', { class: 'digest-month' }, [
    el('div', { class: 'month-nav' }, [
      el('div', { class: 'nav-circle', onClick: actions.monthPrev }, svg(CHEV_LEFT)),
      el('span', { class: 'month-label' }, monthLabel),
      el('div', { class: 'nav-circle', onClick: actions.monthNext }, svg(CHEV_RIGHT)),
    ]),
    el('div', { class: 'weekday-letters' }, ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(wd => el('div', { class: 'weekday-letter' }, wd))),
    el('div', { class: 'month-grid' }, cells.map(c => renderMonthCell(c, actions))),
    selectedDayItems.length > 0
      ? el('div', { class: 'list-rows month-selected-list' }, selectedDayItems.map(it => renderMonthSelectedRow(it)))
      : null,
    el('div', { class: 'spacer-8' }),
  ]);
}

function renderMonthCell(c, actions) {
  return el('div', {
    class: 'month-cell',
    style: {
      background: c.isToday ? 'oklch(0.93 0.045 35)' : (c.selected ? 'oklch(0.95 0.01 60)' : 'transparent'),
      color: c.inMonth ? 'oklch(0.28 0.015 60)' : 'oklch(0.8 0.008 60)',
      cursor: c.clickable ? 'pointer' : 'default',
    },
    onClick: c.clickable ? () => actions.selectMonthDay(c.key) : null,
  }, [
    el('span', { class: 'month-cell-num' }, String(c.num)),
    el('div', { class: 'month-cell-dots' }, [
      c.hasAction ? el('div', { class: 'dot dot-action' }) : null,
      c.hasFyi ? el('div', { class: 'dot dot-fyi' }) : null,
    ]),
  ]);
}

function renderMonthSelectedRow(it) {
  return el('div', { class: 'month-selected-row', style: { background: it.rowBg }, onClick: it.open }, [
    el('div', { class: 'month-selected-left' }, [
      el('div', { class: 'month-selected-title' }, it.title),
      el('span', { class: 'chip-month-selected', style: { color: it.chipColor, background: it.chipBg } }, it.channel),
    ]),
    el('span', { class: 'month-selected-date' }, it.dateLabel),
  ]);
}

function renderYear(state, actions) {
  const yearCursor = state.yearCursor;
  const tiles = MONTH_NAMES.map((name, idx) => {
    const has = state.items.some(it => {
      const d = new Date(it.date);
      return d.getFullYear() === yearCursor && d.getMonth() === idx;
    });
    return { name: name.slice(0, 3), has, idx };
  });
  return el('div', { class: 'digest-year' }, [
    el('div', { class: 'year-nav' }, [
      el('div', { class: 'nav-circle', onClick: actions.yearPrev }, svg(CHEV_LEFT)),
      el('span', { class: 'year-label' }, String(yearCursor)),
      el('div', { class: 'nav-circle', onClick: actions.yearNext }, svg(CHEV_RIGHT)),
    ]),
    el('div', { class: 'year-grid' }, tiles.map(t => el('div', { class: 'year-tile', onClick: () => actions.jumpToMonth(yearCursor, t.idx) }, [
      el('span', { class: 'year-tile-name' }, t.name),
      el('div', { class: 'dot', style: { background: t.has ? 'oklch(0.62 0.15 35)' : 'transparent' } }),
    ]))),
    el('div', { class: 'spacer-8' }),
  ]);
}
