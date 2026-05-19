// loadVault — adapter-driven vault loader. Reads `TASKS.md` from the
// vault root (treats missing as an empty vault), walks `library/**.md`
// recursively, and parses both into the shapes the views expect.
// Pure on top of FileAdapter — works against the in-memory adapter in
// tests and the FSA adapter in the browser without changing.

import type { FileAdapter, LibraryDoc, Vault } from '@markdown-board/core';
import { FileNotFoundError, parseLibrary, parseTasks } from '@markdown-board/core';
import { ensureUniqueTaskIds } from './mutate.js';

export interface LoadedVault {
  vault: Vault;
  libraryDocs: LibraryDoc[];
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
    libraryDocs.push(parseLibrary(content));
  }

  return { vault, libraryDocs };
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
