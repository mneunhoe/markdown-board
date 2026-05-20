// Tab keys + ordered descriptor list shared between the TabBar atom and
// the VaultWorkspace composer. Built-in views have fixed keys; plugin views
// contribute additional descriptors at runtime, so `TabKey` is a plain string
// (a namespaced `<plugin>:<id>` for plugin views).

export const BUILTIN_TAB_KEYS = ['board', 'list', 'library', 'overview'] as const;
export type BuiltinTabKey = (typeof BUILTIN_TAB_KEYS)[number];

/** A tab key — a built-in key or a plugin-contributed `<plugin>:<id>` key. */
export type TabKey = string;

export interface TabDescriptor {
  key: TabKey;
  label: string;
}

export const TABS: readonly TabDescriptor[] = [
  { key: 'board', label: 'Board' },
  { key: 'list', label: 'List' },
  { key: 'library', label: 'Library' },
  { key: 'overview', label: 'Overview' },
];
