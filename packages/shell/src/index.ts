export { default as VaultApp } from './VaultApp.svelte';
export type {
  ExternalOpenEvent,
  ExternalOpenHandler,
  LoadablePlugin,
  RecentVault,
  VaultAdapter,
  VaultPlatform,
  VaultWatcher,
  WatcherDeps,
} from './lib/platform.js';
export { ExternalChangeWatcher, type ExternalChangeWatcherOptions } from './lib/vault/index.js';
export { applyTheme, loadSettings, saveSettings, type Settings } from './lib/settings.js';
// Re-exported from ui (where the view context lives) for convenience.
export {
  getViewContext,
  setViewContext,
  type ViewContext,
  type ViewHandlers,
} from '@markdown-board/ui';
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
