import { mount } from 'svelte';
import App from './App.svelte';
import '@markdown-board/ui/theme/tokens.css';
import './app.css';

const target = document.getElementById('app');
if (!target) {
  throw new Error('Could not find #app element to mount to.');
}

const app = mount(App, { target });

export default app;
