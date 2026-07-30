export function chipStyle(hue) {
  return { chipBg: `oklch(0.93 0.045 ${hue})`, chipColor: `oklch(0.42 0.11 ${hue})` };
}

export const PROVIDER_META = {
  none: null,
  google: { label: 'Google Calendar', color: 'oklch(0.55 0.14 145)' },
  outlook: { label: 'Outlook Calendar', color: 'oklch(0.5 0.14 250)' },
};
