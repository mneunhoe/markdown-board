export { default as VaultApp } from './VaultApp.svelte';
export type {
  ExternalOpenEvent,
  ExternalOpenHandler,
  VaultAdapter,
  VaultPlatform,
  VaultWatcher,
  WatcherDeps,
} from './lib/platform.js';
export { ExternalChangeWatcher, type ExternalChangeWatcherOptions } from './lib/vault/index.js';
export { applyTheme, loadSettings, saveSettings, type Settings } from './lib/settings.js';
