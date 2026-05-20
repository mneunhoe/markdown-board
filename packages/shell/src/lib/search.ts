// Full-text search over a vault's tasks + library docs, backed by MiniSearch.
//
// Pure and UI-free: VaultApp flattens the current vault into `SearchDoc`s,
// builds an index (cheap — rebuilt when the search modal opens), and the modal
// calls `runSearch` per keystroke. Results carry enough to render a preview and
// jump to the source (open the task editor or the library file).

import type { LibraryDoc, Vault } from '@markdown-board/core';
import MiniSearch from 'minisearch';

export type SearchDocType = 'task' | 'library';

export interface SearchDoc {
  id: string;
  type: SearchDocType;
  title: string;
  body: string;
  project: string;
  /** Display context: section name (task) or folder hint (library). */
  context: string;
  taskId: string;
  sectionId: string;
  path: string;
}

export interface SearchResult {
  id: string;
  type: SearchDocType;
  title: string;
  context: string;
  snippet: string;
  /** Jump target — set for tasks. */
  taskId: string;
  sectionId: string;
  /** Jump target — set for library docs. */
  path: string;
}

const SEARCH_FIELDS = ['title', 'body', 'project'] as const;
const STORE_FIELDS = ['type', 'title', 'body', 'context', 'taskId', 'sectionId', 'path'] as const;

/** Flatten a vault + library into indexable documents. */
export function buildSearchDocs(vault: Vault, libraryDocs: LibraryDoc[]): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const section of vault.sections) {
    for (const task of section.tasks) {
      const body = [task.note, ...task.subtasks.map((s) => s.text)].filter(Boolean).join(' ');
      docs.push({
        id: `task:${section.id}:${task.id}`,
        type: 'task',
        title: task.title,
        body,
        project: task.project ?? '',
        context: section.name,
        taskId: task.id,
        sectionId: section.id,
        path: '',
      });
    }
  }
  for (const doc of libraryDocs) {
    const fieldText = Object.values(doc.fields).join(' ');
    docs.push({
      id: `lib:${doc.path || doc.title}`,
      type: 'library',
      title: doc.title,
      body: [doc.rawContent, fieldText].filter(Boolean).join(' '),
      project: '',
      context: 'Library',
      taskId: '',
      sectionId: '',
      path: doc.path,
    });
  }
  return docs;
}

export function createSearchIndex(docs: SearchDoc[]): MiniSearch<SearchDoc> {
  const index = new MiniSearch<SearchDoc>({
    fields: [...SEARCH_FIELDS],
    storeFields: [...STORE_FIELDS],
    searchOptions: {
      boost: { title: 2, project: 1.5 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
  index.addAll(docs);
  return index;
}

function buildSnippet(body: string, terms: string[], max = 140): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (text === '') return '';
  const lower = text.toLowerCase();
  let idx = -1;
  for (const term of terms) {
    const i = lower.indexOf(term.toLowerCase());
    if (i >= 0 && (idx < 0 || i < idx)) idx = i;
  }
  if (idx < 0) return text.length > max ? `${text.slice(0, max)}…` : text;
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, start + max);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export function runSearch(index: MiniSearch<SearchDoc>, query: string, limit = 20): SearchResult[] {
  if (query.trim() === '') return [];
  const raw = index.search(query) as unknown as Array<
    SearchResult & { terms: string[]; body: string }
  >;
  return raw.slice(0, limit).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    context: r.context,
    snippet: buildSnippet(r.body, r.terms),
    taskId: r.taskId,
    sectionId: r.sectionId,
    path: r.path,
  }));
}
