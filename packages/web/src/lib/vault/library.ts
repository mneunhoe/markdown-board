// Library editor save path — used by the LibraryEditorModal flow
// (slice 6d). Writes via FileAdapter, re-parses into a LibraryDoc, and
// either replaces the existing doc in the in-memory array (when the
// path already exists) or appends a new one.
//
// Does NOT route through the Autosaver: library files are rarer and
// larger than TASKS.md, the modal commits on an explicit Save, and an
// autosave on a 400-line textarea would be hostile mid-edit. The
// mirroring decision in `dashboard.html:5446-5452` (explicit Save
// button + click-outside-cancel) matches.

import type { FileAdapter, LibraryDoc } from '@markdown-board/core';
import { parseLibrary } from '@markdown-board/core';

/**
 * Write `content` to `path`, re-parse it, and merge the resulting
 * LibraryDoc into `docs`. When `path` matches an existing doc, the
 * doc at that index is replaced in place; otherwise the new doc is
 * appended. The mutated array is returned so the caller can update
 * its `$state` reference if needed (Svelte 5 deep proxies handle the
 * splice / push automatically).
 *
 * Returns the (re-)parsed doc so the caller can surface confirmation
 * or update related state (e.g. refresh the external-change watcher's
 * mtime baseline for this path).
 */
export async function saveLibraryFile(
  adapter: FileAdapter,
  docs: LibraryDoc[],
  path: string,
  content: string,
): Promise<LibraryDoc> {
  await adapter.writeFile(path, content);
  const doc = parseLibrary(content);
  doc.path = path;

  const idx = docs.findIndex((d) => d.path === path);
  if (idx === -1) {
    docs.push(doc);
  } else {
    docs.splice(idx, 1, doc);
  }
  return doc;
}
