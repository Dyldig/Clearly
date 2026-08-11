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
  if (!resp.ok) throw new Error(`${path} failed: ${resp.status}`);
  return resp.status === 204 ? null : resp.json();
}

export function fetchMessages() {
  return apiFetch('/api/messages');
}

export function updateMessage(id, patch) {
  return apiFetch('/api/messages', { method: 'POST', body: JSON.stringify({ id, ...patch }) });
}
