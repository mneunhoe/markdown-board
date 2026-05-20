// Tab keys + ordered descriptor list shared between the TabBar atom and
// the VaultWorkspace composer. Single source of truth so the rendered
// order matches the type union.

export const TAB_KEYS = ['board', 'list', 'library', 'overview'] as const;
export type TabKey = (typeof TAB_KEYS)[number];

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
