// Channel identity/state is still local-only for now — real messages come
// from the backend (see api.js), but connection status, mute, and priority
// aren't tied to a live integration yet, so they stay client-side.

export const CHANNELS = [
  { id: 'seesaw', name: 'Seesaw', category: 'Fig Tree Primary · School', hue: 230, status: 'connected', synced: 'Synced 2m ago', muted: false, priority: true },
  { id: 'qkr', name: 'QKR', category: 'Fig Tree Primary · Payments', hue: 145, status: 'connected', synced: 'Synced 1h ago', muted: false, priority: false },
  { id: 'ryde', name: 'Ryde United FC', category: 'Mia · Soccer club', hue: 50, status: 'connected', synced: 'Synced 15m ago', muted: false, priority: true },
  { id: 'medical', name: 'Sydney Kids Medical', category: 'Medical portal', hue: 10, status: 'connected', synced: 'Synced yesterday', muted: false, priority: false },
  { id: 'strata', name: 'Horizon Strata', category: 'Body corporate', hue: 290, status: 'connected', synced: 'Synced 3d ago', muted: true, priority: false },
  { id: 'community', name: 'Fig Tree Families', category: 'Community group', hue: 180, status: 'syncing', synced: 'Syncing…', muted: true, priority: false },
];
