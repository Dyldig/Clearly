import { ITEMS, CHANNELS } from './data.js';

const CALENDAR_PROVIDER_KEY = 'clearly.calendarProvider';

export function createInitialState() {
  return {
    activeTab: 'home',
    selectedItemId: null,
    expandedOriginal: false,
    items: ITEMS.map(it => ({ ...it, addedToCalendar: false })),
    channels: CHANNELS.map(c => ({ ...c })),
    digestView: 'week',
    dayIndex: 0,
    monthCursor: { y: 2026, m: 7 },
    yearCursor: 2026,
    monthSelectedKey: null,
    calendarProvider: localStorage.getItem(CALENDAR_PROVIDER_KEY) || 'google',
    filtersOpen: false,
    filters: { channels: [], attention: 'all', dateFrom: '', dateTo: '' },
  };
}

export function persistCalendarProvider(value) {
  localStorage.setItem(CALENDAR_PROVIDER_KEY, value);
}
