// Talks to the Vercel backend for real message data. Note: CLIENT_API_TOKEN
// ships inside this file to the browser and is readable by anyone who views
// source — it only deters casual/accidental access to the API, it is not
// real authentication. There's no user-account system yet, so this data is
// effectively protected by URL + token obscurity rather than a real login.
const API_BASE = 'https://clearly-git-main-dylan-6f12.vercel.app';
const CLIENT_API_TOKEN = '054c3017f60e6bf67fca263cd4312e7c';

async function apiFetch(path, opts = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${CLIENT_API_TOKEN}`,
      'content-type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!resp.ok) {
    let message = `${path} failed: ${resp.status}`;
    try {
      const body = await resp.json();
      if (body && body.error) message = body.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }
  return resp.status === 204 ? null : resp.json();
}

export function fetchMessages() {
  return apiFetch('/api/messages');
}

export function updateMessage(id, patch) {
  return apiFetch('/api/messages', { method: 'POST', body: JSON.stringify({ id, ...patch }) });
}

export function deleteMessage(id) {
  return apiFetch('/api/messages', { method: 'DELETE', body: JSON.stringify({ id }) });
}

export function ignoreSimilarMessage(id) {
  return apiFetch('/api/messages', { method: 'POST', body: JSON.stringify({ id, ignoreSimilar: true }) });
}

export function fetchCalendarStatus() {
  return apiFetch('/api/calendar-status');
}

export function addEventToCalendar(eventId) {
  return apiFetch('/api/calendar-event', { method: 'POST', body: JSON.stringify({ eventId }) });
}

export function removeEventFromCalendar(eventId) {
  return apiFetch('/api/calendar-event', { method: 'DELETE', body: JSON.stringify({ eventId }) });
}

export function disconnectCalendar() {
  return apiFetch('/api/calendar-disconnect', { method: 'POST' });
}

export function connectCalendarUrl() {
  return `${API_BASE}/api/auth/microsoft/start`;
}

export function fetchChannelSenders() {
  return apiFetch('/api/channel-senders');
}

export function addChannelSender(matchPattern, channel) {
  return apiFetch('/api/channel-senders', { method: 'POST', body: JSON.stringify({ matchPattern, channel }) });
}

export function setChannelSenderMuted(id, muted) {
  return apiFetch('/api/channel-senders', { method: 'POST', body: JSON.stringify({ id, muted }) });
}

export function deleteChannelSender(id) {
  return apiFetch('/api/channel-senders', { method: 'DELETE', body: JSON.stringify({ id }) });
}

export function fetchProfile() {
  return apiFetch('/api/profile');
}

export function saveProfile(patch) {
  return apiFetch('/api/profile', { method: 'POST', body: JSON.stringify(patch) });
}

export function savePushSubscription({ endpoint, keys, notifyActionOnly }) {
  return apiFetch('/api/push-subscription', { method: 'POST', body: JSON.stringify({ endpoint, keys, notifyActionOnly }) });
}

export function removePushSubscription(endpoint) {
  return apiFetch('/api/push-subscription', { method: 'DELETE', body: JSON.stringify({ endpoint }) });
}
