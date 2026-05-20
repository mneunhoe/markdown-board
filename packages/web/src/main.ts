import { mount } from 'svelte';
import App from './App.svelte';
import '@markdown-board/ui/theme/tokens.css';
import './app.css';
import { applyTheme, loadSettings } from '@markdown-board/shell';

// Apply the persisted theme *before* mount so dark-mode users don't
// see a flash of light-theme content on first paint.
applyTheme(loadSettings().theme);

const target = document.getElementById('app');
if (!target) {
  throw new Error('Could not find #app element to mount to.');
}

const app = mount(App, { target });

export default app;
