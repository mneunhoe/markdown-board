export { default as VaultApp } from './VaultApp.svelte';
export type {
  ExternalOpenEvent,
  ExternalOpenHandler,
  RecentVault,
  VaultAdapter,
  VaultPlatform,
  VaultWatcher,
  WatcherDeps,
} from './lib/platform.js';
export { ExternalChangeWatcher, type ExternalChangeWatcherOptions } from './lib/vault/index.js';
export { applyTheme, loadSettings, saveSettings, type Settings } from './lib/settings.js';
export {
  getViewContext,
  setViewContext,
  type ViewContext,
  type ViewHandlers,
} from './lib/plugins/view-context.js';
export {
  parseTheme,
  compileTheme,
  loadVaultTheme,
  clearVaultTheme,
  watchVaultTheme,
  THEME_FILE,
  type ThemeConfig,
  type ThemeStatus,
} from './lib/theme/index.js';
