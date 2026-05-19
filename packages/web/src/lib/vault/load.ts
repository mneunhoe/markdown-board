// loadVault — adapter-driven vault loader. Reads `TASKS.md` from the
// vault root (treats missing as an empty vault), walks `library/**.md`
// recursively, parses `archive/TASKS.md` when present, and returns the
// three shapes the views consume. Pure on top of FileAdapter — works
// against the in-memory adapter in tests and the FSA adapter in the
// browser without changing.

import type { FileAdapter, LibraryDoc, Vault } from '@markdown-board/core';
import { FileNotFoundError, parseLibrary, parseTasks } from '@markdown-board/core';
import { ensureUniqueTaskIds } from './mutate.js';
import { ARCHIVE_PATH } from './resolve.js';

export interface LoadedVault {
  vault: Vault;
  libraryDocs: LibraryDoc[];
  /**
   * Parsed `archive/TASKS.md` content. `null` when the file does not
   * exist on disk (an empty archive with only the `# Archived Tasks`
   * prelude still returns a `Vault` — distinguishing "no file" from
   * "file exists but empty" matters for the UI's "Archived" expander
   * (slice 6g-2) which suppresses itself for null but renders an
   * empty state for an empty-but-present archive).
   */
  archive: Vault | null;
}

export async function loadVault(adapter: FileAdapter): Promise<LoadedVault> {
  const tasksMd = await readOrEmpty(adapter, 'TASKS.md');
  const vault = parseTasks(tasksMd);
  // Mint missing / colliding ids so DnD reorder handlers can identify
  // tasks unambiguously. The next autosave persists the new ids as
  // `<!-- id:... -->` comments per the §15.1 emitter contract.
  ensureUniqueTaskIds(vault);

  const paths = await collectLibraryMarkdownPaths(adapter);
  const libraryDocs: LibraryDoc[] = [];
  for (const path of paths) {
    const content = await adapter.readFile(path);
    const doc = parseLibrary(content);
    doc.path = path;
    libraryDocs.push(doc);
  }

  const archive = await loadArchive(adapter);

  return { vault, libraryDocs, archive };
}

/**
 * Read `archive/TASKS.md` and parse it as a `Vault`. Returns `null`
 * when the file does not exist. Each archived entry's H2 (e.g.
 * `## 2026-05-18 10:43 — Active`) becomes a section whose `name`
 * carries the timestamp + the original source-section name; consumers
 * regroup by `sourceSection` at render time (slice 6g-3).
 */
export async function loadArchive(adapter: FileAdapter): Promise<Vault | null> {
  let content: string;
  try {
    content = await adapter.readFile(ARCHIVE_PATH);
  } catch (err) {
    if (err instanceof FileNotFoundError) return null;
    throw err;
  }
  return parseTasks(content);
}

async function readOrEmpty(adapter: FileAdapter, path: string): Promise<string> {
  try {
    return await adapter.readFile(path);
  } catch (err) {
    if (err instanceof FileNotFoundError) return '';
    throw err;
  }
}

async function collectLibraryMarkdownPaths(adapter: FileAdapter): Promise<string[]> {
  const out: string[] = [];
  try {
    await walkMarkdownFiles(adapter, 'library', out);
  } catch (err) {
    if (err instanceof FileNotFoundError) return [];
    throw err;
  }
  out.sort();
  return out;
}

async function walkMarkdownFiles(adapter: FileAdapter, dir: string, out: string[]): Promise<void> {
  const entries = await adapter.listDir(dir);
  for (const entry of entries) {
    const fullPath = `${dir}/${entry.name}`;
    if (entry.kind === 'directory') {
      await walkMarkdownFiles(adapter, fullPath, out);
    } else if (entry.name.endsWith('.md')) {
      out.push(fullPath);
    }
  }
}
