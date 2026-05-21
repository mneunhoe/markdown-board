<script lang="ts">
  import {
    buildBacklinks,
    buildLinkLookup,
    docKey,
    resolveWikiLink,
    splitByWikiLinks,
    type LibraryDoc,
  } from '@markdown-board/core';
  import EmptyState from '../components/EmptyState.svelte';

  interface Props {
    docs: LibraryDoc[];
    emptyTitle?: string;
    emptyHint?: string;
    /**
     * When provided, each library doc renders an "Edit" button in its
     * header (and an "+ New file" affordance at the bottom of the view).
     * The handler receives the source `path` so the host shell can open
     * an editor modal for that file. `null` opens the new-file dialog
     * with a blank initial value.
     */
    onEdit?: (path: string | null) => void;
  }

  const {
    docs,
    emptyTitle = 'No library entries yet',
    emptyHint = 'Drop Markdown files into `library/` to see them here.',
    onEdit,
  }: Props = $props();

  const hasDocs = $derived(docs.length > 0);
  const editable = $derived(onEdit !== undefined);

  // Wiki-link plumbing: a name→doc lookup (to know which `[[links]]` resolve)
  // and a backlink index (which docs link *to* each doc), both keyed by docKey.
  const lookup = $derived(buildLinkLookup(docs));
  const backlinks = $derived(buildBacklinks(docs));

  function nonIntroSections(doc: LibraryDoc): Array<[string, string]> {
    return Object.entries(doc.sections).filter(([name, content]) => name !== '_intro' && content);
  }

  /** DOM id for a doc's article, derived from its stable docKey. */
  function idForKey(key: string): string {
    return `lib-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }

  function scrollToKey(key: string): void {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(idForKey(key));
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function onWikiLink(target: string): void {
    const doc = resolveWikiLink(target, lookup);
    if (doc) scrollToKey(docKey(doc));
  }

  function linkResolves(target: string): boolean {
    return resolveWikiLink(target, lookup) !== null;
  }
</script>

{#snippet wikiText(
  content: string,
)}{#each splitByWikiLinks(content) as seg, i (i)}{#if seg.kind === 'text'}{seg.text}{:else if linkResolves(seg.target)}<button
        type="button"
        class="wikilink"
        data-testid="wikilink"
        data-target={seg.target}
        onclick={() => onWikiLink(seg.target)}>{seg.label}</button
      >{:else}<span class="wikilink unresolved" data-testid="wikilink-unresolved">{seg.label}</span
      >{/if}{/each}{/snippet}

{#if hasDocs}
  <div class="library-view">
    {#each docs as doc (doc.title || doc.rawContent.slice(0, 40))}
      <article class="library-doc" id={idForKey(docKey(doc))}>
        <header class="library-doc-header">
          <h2 class="library-doc-title">{doc.title || 'Untitled'}</h2>
          {#if editable}
            <button
              type="button"
              class="library-edit-btn"
              data-testid="library-edit-{doc.path}"
              data-path={doc.path}
              aria-label="Edit {doc.path}"
              onclick={() => onEdit?.(doc.path)}>Edit</button
            >
          {/if}
        </header>

        {#if Object.keys(doc.fields).length > 0}
          <dl class="library-fields">
            {#each Object.entries(doc.fields) as [key, value] (key)}
              <div class="library-field">
                <dt>{key}</dt>
                <dd>{@render wikiText(value)}</dd>
              </div>
            {/each}
          </dl>
        {/if}

        {#if doc.sections._intro}
          <div class="library-section" data-testid="library-intro">
            <pre class="library-section-content">{@render wikiText(doc.sections._intro)}</pre>
          </div>
        {/if}

        {#each nonIntroSections(doc) as [name, content] (name)}
          <section class="library-section">
            <h3 class="library-section-title">{name}</h3>
            <pre class="library-section-content">{@render wikiText(content)}</pre>
          </section>
        {/each}

        {#each doc.tables as table, i (i)}
          <table class="library-table">
            <thead>
              <tr>
                {#each table.headers as header, j (j)}
                  <th>{header}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each table.rows as row, r (r)}
                <tr>
                  {#each row as cell, c (c)}
                    <td>{@render wikiText(cell)}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        {/each}

        {#if (backlinks.get(docKey(doc)) ?? []).length > 0}
          <section class="library-backlinks" data-testid="backlinks">
            <h3 class="library-section-title">Linked from</h3>
            <ul class="backlink-list">
              {#each backlinks.get(docKey(doc)) ?? [] as bl (bl.fromKey)}
                <li>
                  <button
                    type="button"
                    class="wikilink"
                    data-testid="backlink"
                    onclick={() => scrollToKey(bl.fromKey)}>{bl.fromTitle || bl.fromPath}</button
                  >
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </article>
    {/each}
    {#if editable}
      <button
        type="button"
        class="library-new-btn"
        data-testid="library-new"
        onclick={() => onEdit?.(null)}>+ New file</button
      >
    {/if}
  </div>
{:else if editable}
  <div class="library-view">
    <EmptyState title={emptyTitle} hint={emptyHint} />
    <button
      type="button"
      class="library-new-btn"
      data-testid="library-new"
      onclick={() => onEdit?.(null)}>+ New file</button
    >
  </div>
{:else}
  <EmptyState title={emptyTitle} hint={emptyHint} />
{/if}

<style>
  .library-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 4px 4px 24px;
  }

  .library-doc {
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: 12px;
    padding: 20px 24px;
    box-shadow: 0 1px 3px var(--shadow);
  }

  .library-doc-header {
    border-bottom: 1px solid var(--border-light);
    margin-bottom: 16px;
    padding-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .library-doc-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .library-edit-btn {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .library-edit-btn:hover {
    border-color: var(--accent);
  }

  .library-new-btn {
    appearance: none;
    border: 1px dashed var(--border);
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: 13px;
    font-style: italic;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
  }

  .library-new-btn:hover {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .library-fields {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 16px;
    margin: 0 0 16px 0;
    font-size: 13px;
  }

  .library-field {
    display: contents;
  }

  .library-field dt {
    font-weight: 600;
    color: var(--text-secondary);
  }

  .library-field dd {
    margin: 0;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .library-section {
    margin-top: 16px;
  }

  .library-section-title {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .library-section-content {
    margin: 0;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-primary);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .library-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    font-size: 13px;
  }

  .library-table th,
  .library-table td {
    text-align: left;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border-light);
    vertical-align: top;
  }

  .library-table th {
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--bg-secondary);
  }

  .wikilink {
    appearance: none;
    background: transparent;
    border: 0;
    padding: 0;
    margin: 0;
    font: inherit;
    color: var(--accent);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .wikilink:hover {
    color: var(--accent-hover);
  }

  .wikilink.unresolved {
    color: var(--text-muted);
    cursor: default;
    text-decoration: underline dotted;
  }

  .library-backlinks {
    margin-top: 16px;
    border-top: 1px solid var(--border-light);
    padding-top: 12px;
  }

  .backlink-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
  }
</style>
