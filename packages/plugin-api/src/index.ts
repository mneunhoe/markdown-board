// @markdown-board/plugin-api — the stable, framework-light contract every
// markdown-board plugin compiles against. Types + the version constant only;
// no runtime logic, so the contract can be versioned independently of the app.
//
// Trust model: plugins run **in-process, unsandboxed**, with full app and file
// access via this API. There is no isolation layer. See docs/plugins.md.

import type { Component } from 'svelte';
import type { Day, LibraryDoc, Task, Vault } from '@markdown-board/core';

/**
 * Semver of this contract. The host compares a plugin's `minAppVersion`
 * against this; an incompatible plugin is refused activation.
 */
export const PLUGIN_API_VERSION = '1.0.0';

/** Re-export the core model types plugins build against (single source of truth). */
export type { Day, LibraryDoc, Task, Vault };

/** A handle that undoes a registration. Idempotent: calling twice is a no-op. */
export interface Disposable {
  dispose(): void;
}

// ─── Manifest ────────────────────────────────────────────────────────────────

export interface PluginManifest {
  /** Stable id, also the storage namespace and settings key (e.g. "pomodoro"). */
  id: string;
  name: string;
  /** Plugin semver. */
  version: string;
  /** JS entry, relative to the plugin root (third-party local-path loading). */
  entry: string;
  /** Minimum `PLUGIN_API_VERSION` this plugin needs (semver range or version). */
  minAppVersion: string;
  description?: string;
  author?: string;
  /** Schema driving the plugin's settings UI + defaults. */
  settings?: SettingsSchema;
}

// ─── Settings schema ─────────────────────────────────────────────────────────

export type SettingsField =
  | {
      key: string;
      label: string;
      type: 'number';
      default: number;
      min?: number;
      max?: number;
      hint?: string;
    }
  | { key: string; label: string; type: 'text'; default: string; hint?: string }
  | { key: string; label: string; type: 'boolean'; default: boolean; hint?: string };

export type SettingsSchema = readonly SettingsField[];

// ─── Components ──────────────────────────────────────────────────────────────

/**
 * A Svelte 5 component contributed as a view or slot. It takes no required
 * props — it reads vault data + handlers from the shell-provided view context
 * (see `getViewContext` in the shell).
 */
export type PluginComponent = Component<Record<string, never>>;

// ─── Commands ────────────────────────────────────────────────────────────────

export interface CommandOptions {
  /** Palette label. Falls back to a humanised id when omitted. */
  title?: string;
  /** Palette category label. */
  group?: string;
  /** Extra fuzzy-match terms (not displayed). */
  keywords?: string[];
  /** Default keybinding, e.g. "Mod+Shift+P". Users can remap in settings. */
  keybinding?: string;
  /** When `false`, hidden from the palette. Defaults to enabled. */
  enabled?: boolean;
}

export interface CommandRegistry {
  /** Register a palette command. The id is namespaced by the host as `<plugin>:<id>`. */
  register(id: string, run: () => void | Promise<void>, opts?: CommandOptions): Disposable;
}

// ─── Views (tabs) ────────────────────────────────────────────────────────────

export interface ViewOptions {
  /** Tab label. */
  title: string;
}

export interface ViewRegistry {
  /** Contribute a top-level view rendered as a tab alongside Board/List/… */
  register(id: string, component: PluginComponent, opts: ViewOptions): Disposable;
}

// ─── Slots ───────────────────────────────────────────────────────────────────

/** Mount points the shell exposes for plugin-contributed UI. */
export type SlotName = 'header' | 'view-toolbar';

export interface SlotOptions {
  /** Lower numbers render first. Defaults to registration order. */
  order?: number;
}

export interface SlotRegistry {
  register(slot: SlotName, component: PluginComponent, opts?: SlotOptions): Disposable;
}

// ─── Task actions ────────────────────────────────────────────────────────────

/** Identifies a task within the live vault. */
export interface TaskRef {
  taskId: string;
  sectionId: string;
}

export interface TaskActionSpec {
  id: string;
  /** Accessible label / tooltip. */
  label: string;
  /** Short glyph rendered on the card button (e.g. "▶"). */
  icon?: string;
  run(ref: TaskRef): void | Promise<void>;
}

export interface TaskActionRegistry {
  /** Contribute a per-card action button (e.g. pomodoro's start). */
  register(action: TaskActionSpec): Disposable;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export interface HookEvents {
  'vault.opened': { vaultPath: string | null };
  'vault.saved': { vaultPath: string | null };
  'task.created': { ref: TaskRef; task: Task };
  /** Best-effort: fires on explicit edit/move handlers, not every proxy write. */
  'task.updated': { ref: TaskRef; before: Task; after: Task };
  'task.resolved': { ref: TaskRef; task: Task; resolution: string };
}

export interface HookRegistry {
  on<E extends keyof HookEvents>(
    event: E,
    handler: (payload: HookEvents[E]) => void | Promise<void>,
  ): Disposable;
}

// ─── Scoped storage ──────────────────────────────────────────────────────────

/**
 * Per-plugin key-value store persisted to `.markdown-board/plugins/<id>.json`
 * in the vault (portable, syncs with the vault).
 */
export interface ScopedStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

// ─── Live vault access ───────────────────────────────────────────────────────

export interface TasksApi {
  /** Look up a task in the open vault. `null` when not found / no vault open. */
  find(ref: TaskRef): Task | null;
  /**
   * Mutate a task in place on the live vault, triggering autosave. Returns
   * `false` when the task no longer exists.
   */
  mutate(ref: TaskRef, mutator: (task: Task) => void): boolean;
}

// ─── Host UI capabilities ────────────────────────────────────────────────────

export interface UiApi {
  /** Save text to a user-chosen location (web → download, desktop → save dialog). */
  saveFile(name: string, contents: string, mime?: string): Promise<void>;
  /** Surface a transient status message to the user. */
  notify(message: string): void;
}

// ─── Plugin settings accessor ────────────────────────────────────────────────

export interface PluginSettingsApi<T = Record<string, unknown>> {
  /** Current settings for this plugin, defaults applied from the manifest schema. */
  get(): T;
}

// ─── Logger ──────────────────────────────────────────────────────────────────

export interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

// ─── The activation context (the `api`) ──────────────────────────────────────

export interface PluginContext {
  manifest: PluginManifest;
  /** The host's `PLUGIN_API_VERSION`. */
  appVersion: string;
  commands: CommandRegistry;
  views: ViewRegistry;
  slots: SlotRegistry;
  taskActions: TaskActionRegistry;
  hooks: HookRegistry;
  storage: ScopedStorage;
  tasks: TasksApi;
  ui: UiApi;
  settings: PluginSettingsApi;
  log: Logger;
}

export interface PluginModule {
  activate(ctx: PluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}
