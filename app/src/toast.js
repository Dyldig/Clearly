import { el } from './dom.js';

let currentEl = null;
let hideTimer = null;

// A small bottom-of-screen overlay, outside the normal render-from-state
// tree since it's transient UI, not app data. Used for swipe-to-delete's
// Undo prompt and the pull-to-refresh summary.
export function showToast(message, { actionLabel, onAction, duration = 4000 } = {}) {
  hideToast();

  currentEl = el('div', { class: 'toast' }, [
    el('span', { class: 'toast-message' }, message),
    actionLabel ? el('button', {
      class: 'toast-action',
      onClick: () => { onAction && onAction(); hideToast(); },
    }, actionLabel) : null,
  ]);

  const host = document.querySelector('.device') || document.body;
  host.appendChild(currentEl);
  requestAnimationFrame(() => currentEl && currentEl.classList.add('toast-visible'));
  hideTimer = setTimeout(hideToast, duration);
}

function hideToast() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  if (currentEl) { currentEl.remove(); currentEl = null; }
}
