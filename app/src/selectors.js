import { chipStyle } from './colors.js';

// The single shared view-model for a communication item — feeds the Home
// rows, the Digest list rows and the Month view's selected-day rows. Each
// consumer picks whichever subset of these fields its layout uses.
export function mapItem(it, actions) {
  const { chipBg, chipColor } = chipStyle(it.hue);
  return {
    id: it.id,
    channel: it.channel,
    title: it.title,
    dateLabel: it.dateLabel || '',
    chipBg, chipColor,
    rowBg: it.read ? 'oklch(0.995 0.004 70)' : 'oklch(0.955 0.025 35)',
    rowOpacity: it.read ? 0.72 : 1,
    dotVisible: !it.read,
    titleWeight: it.read ? 500 : 650,
    open: () => actions.openItem(it.id),
  };
}
