const DELETE_THRESHOLD = 90;

// Wires a left-swipe-to-delete gesture onto a row element. Call before the
// row is used — works fine on a detached node, the listeners just wait
// until it's actually in the DOM and receiving touch events.
export function makeSwipeable(rowEl, onDelete) {
  let startX = 0;
  let startY = 0;
  let dragX = 0;
  let dragging = false;
  let axisLocked = null; // 'x' | 'y' | null, decided a few pixels into the gesture

  rowEl.classList.add('swipeable');
  rowEl.style.transition = 'none';

  rowEl.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragX = 0;
    dragging = true;
    axisLocked = null;
    rowEl.style.transition = 'none';
  }, { passive: true });

  rowEl.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!axisLocked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (axisLocked === 'y') return; // let the page scroll normally

    dragX = Math.min(0, dx); // only allow swiping left
    rowEl.style.transform = `translateX(${dragX}px)`;
  }, { passive: true });

  rowEl.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    if (axisLocked !== 'x') return;

    rowEl.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    if (dragX < -DELETE_THRESHOLD) {
      rowEl.style.transform = 'translateX(-100%)';
      rowEl.style.opacity = '0';
      setTimeout(onDelete, 180);
    } else {
      rowEl.style.transform = 'translateX(0)';
    }
  });
}
