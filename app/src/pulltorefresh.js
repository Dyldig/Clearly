import { el } from './dom.js';

const TRIGGER_DISTANCE = 70;
const MAX_PULL = 100;

// Attaches a native-feeling pull-to-refresh gesture to a scrollable
// container. Only activates when the container is already scrolled to the
// top (so it doesn't fight normal scrolling), and only calls onRefresh once
// per pull, past a distance threshold, with resistance past that point.
export function attachPullToRefresh(container, onRefresh) {
  const indicator = el('div', { class: 'pull-indicator' }, el('div', { class: 'pull-spinner' }));
  container.parentElement.insertBefore(indicator, container);

  let startY = 0;
  let pulling = false;
  let dragging = false;
  let refreshing = false;

  container.addEventListener('touchstart', (e) => {
    if (refreshing || container.scrollTop > 0) { dragging = false; return; }
    startY = e.touches[0].clientY;
    dragging = true;
    pulling = false;
    indicator.style.transition = 'none';
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!dragging || refreshing) return;
    const delta = e.touches[0].clientY - startY;
    if (delta <= 0) { pulling = false; indicator.style.height = '0px'; return; }
    pulling = true;
    const eased = Math.min(delta * 0.5, MAX_PULL);
    indicator.style.height = `${eased}px`;
    indicator.classList.toggle('pull-ready', eased >= TRIGGER_DISTANCE * 0.5);
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    indicator.style.transition = 'height 0.2s ease';
    const height = parseFloat(indicator.style.height) || 0;
    if (pulling && height >= TRIGGER_DISTANCE * 0.5) {
      refreshing = true;
      indicator.classList.add('pull-spinning');
      indicator.style.height = '48px';
      Promise.resolve(onRefresh()).finally(() => {
        refreshing = false;
        indicator.classList.remove('pull-spinning', 'pull-ready');
        indicator.style.height = '0px';
      });
    } else {
      indicator.style.height = '0px';
      indicator.classList.remove('pull-ready');
    }
    pulling = false;
  });
}
