// Wiki-style `[[Page]]` links: extraction, resolution, and a backlink index.
//
// Links may carry an alias: `[[Page|shown text]]`. Resolution matches a target
// against a library doc by its title or by its filename (basename without the
// `.md` extension), case-insensitively. These helpers are pure; LibraryView
// renders the segments and backlinks panel from them.

import type { LibraryDoc } from './types.js';

export interface WikiLink {
  /** The page name inside the brackets (before any `|`). */
  target: string;
  /** Display alias after `|`, or `null` when absent. */
  alias: string | null;
}

export type LinkSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; target: string; label: string };

export interface Backlink {
  /** `docKey` of the linking doc (stable scroll/jump target). */
  fromKey: string;
  fromPath: string;
  fromTitle: string;
}

// Capture `[[target]]` or `[[target|alias]]`. Targets/aliases can't contain
// `]` or `|` (alias can't contain `]`).
const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

export function normaliseLinkKey(name: string): string {
  return name.trim().toLowerCase();
}

function basename(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.md$/i, '');
}

/** Stable key identifying a doc as a link target (path, else its title). */
export function docKey(doc: LibraryDoc): string {
  return doc.path ? doc.path : `title:${normaliseLinkKey(doc.title)}`;
}

/** Extract every wiki-link occurrence from `text`, in order. */
export function extractWikiLinks(text: string): WikiLink[] {
  const links: WikiLink[] = [];
  for (const match of text.matchAll(WIKILINK_RE)) {
    const target = match[1]!.trim();
    if (!target) continue;
    const alias = match[2]?.trim();
    links.push({ target, alias: alias ? alias : null });
  }
  return links;
}

/** Split `text` into ordered text / link segments for inline rendering. */
export function splitByWikiLinks(text: string): LinkSegment[] {
  const segments: LinkSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(WIKILINK_RE)) {
    const start = match.index ?? 0;
    const target = match[1]!.trim();
    if (!target) continue;
    if (start > last) segments.push({ kind: 'text', text: text.slice(last, start) });
    const alias = match[2]?.trim();
    segments.push({ kind: 'link', target, label: alias || target });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', text: text.slice(last) });
  return segments;
}

/** Build a name → doc lookup keyed by both title and filename. */
export function buildLinkLookup(docs: LibraryDoc[]): Map<string, LibraryDoc> {
  const lookup = new Map<string, LibraryDoc>();
  for (const doc of docs) {
    if (doc.title) {
      const key = normaliseLinkKey(doc.title);
      if (!lookup.has(key)) lookup.set(key, doc);
    }
    if (doc.path) {
      const key = normaliseLinkKey(basename(doc.path));
      if (!lookup.has(key)) lookup.set(key, doc);
    }
  }
  return lookup;
}

/** Resolve a link target to a doc, or `null` if no match. */
export function resolveWikiLink(
  target: string,
  lookup: Map<string, LibraryDoc>,
): LibraryDoc | null {
  return lookup.get(normaliseLinkKey(target)) ?? null;
}

/**
 * Build a backlink index: for each doc that is linked to, the list of docs
 * that link to it. Keyed by the target's `docKey`. Self-links and duplicate
 * source→target pairs are ignored.
 */
export function buildBacklinks(docs: LibraryDoc[]): Map<string, Backlink[]> {
  const lookup = buildLinkLookup(docs);
  const map = new Map<string, Backlink[]>();
  const seen = new Set<string>();
  for (const src of docs) {
    const srcKey = docKey(src);
    for (const link of extractWikiLinks(src.rawContent)) {
      const target = resolveWikiLink(link.target, lookup);
      if (!target) continue;
      const targetKey = docKey(target);
      if (targetKey === srcKey) continue;
      const pairKey = `${srcKey}->${targetKey}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      const list = map.get(targetKey) ?? [];
      list.push({ fromKey: srcKey, fromPath: src.path, fromTitle: src.title });
      map.set(targetKey, list);
    }
  }
  return map;
}
