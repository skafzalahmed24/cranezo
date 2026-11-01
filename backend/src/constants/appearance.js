// Appearance screen options. The app applies the theme; the server only stores the choice.
// `system` means follow the phone's light / dark setting.
const APPEARANCE_OPTIONS = [
  { id: 'system', name: 'System Default', description: 'Match your device setting' },
  { id: 'light', name: 'Light Mode', description: 'Always use the light theme' },
  { id: 'dark', name: 'Dark Mode', description: 'Always use the dark theme' }
];

const DEFAULT_APPEARANCE = 'system';
const APPEARANCE_IDS = APPEARANCE_OPTIONS.map((o) => o.id);

module.exports = { APPEARANCE_OPTIONS, APPEARANCE_IDS, DEFAULT_APPEARANCE };
