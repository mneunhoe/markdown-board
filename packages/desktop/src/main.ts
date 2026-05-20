import { mount } from 'svelte';
import { applyTheme, loadSettings } from '@markdown-board/shell';
import App from './App.svelte';
import { checkForUpdates } from './lib/updater.js';
import '@markdown-board/ui/theme/tokens.css';
import './app.css';

// Apply the persisted theme before mount so dark-mode users don't see a
// flash of light-theme content on first paint (mirrors the web entry).
applyTheme(loadSettings().theme);

const target = document.getElementById('app');
if (!target) {
  throw new Error('Could not find #app element to mount to.');
}

const app = mount(App, { target });

// Check GitHub Releases for a newer signed build. Fire-and-forget; failures
// (offline, or running in a plain browser via `pnpm dev`) are swallowed.
void checkForUpdates();

export default app;
