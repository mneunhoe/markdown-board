<script lang="ts">
  import type { LibraryDoc } from '@markdown-board/core';
  import EmptyState from '../components/EmptyState.svelte';

  interface Props {
    docs: LibraryDoc[];
    emptyTitle?: string;
    emptyHint?: string;
  }

  const {
    docs,
    emptyTitle = 'No library entries yet',
    emptyHint = 'Drop Markdown files into `library/` to see them here.',
  }: Props = $props();

  const hasDocs = $derived(docs.length > 0);

  function nonIntroSections(doc: LibraryDoc): Array<[string, string]> {
    return Object.entries(doc.sections).filter(([name, content]) => name !== '_intro' && content);
  }
</script>

{#if hasDocs}
  <div class="library-view">
    {#each docs as doc (doc.title || doc.rawContent.slice(0, 40))}
      <article class="library-doc">
        <header class="library-doc-header">
          <h2 class="library-doc-title">{doc.title || 'Untitled'}</h2>
        </header>

        {#if Object.keys(doc.fields).length > 0}
          <dl class="library-fields">
            {#each Object.entries(doc.fields) as [key, value] (key)}
              <div class="library-field">
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            {/each}
          </dl>
        {/if}

        {#each nonIntroSections(doc) as [name, content] (name)}
          <section class="library-section">
            <h3 class="library-section-title">{name}</h3>
            <pre class="library-section-content">{content}</pre>
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
                    <td>{cell}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        {/each}
      </article>
    {/each}
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
  }

  .library-doc-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
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
</style>
