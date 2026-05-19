<script lang="ts">
  import { projectShort, projectColor } from '../lib/project.js';

  interface Props {
    /** Full project tag exactly as it sits on `Task.project` (may include
     * an em-dash / en-dash / colon suffix). The pill displays the short
     * prefix; the full tag is surfaced as a tooltip when it differs. */
    project: string | null;
    /**
     * When provided, the pill becomes a button. Empty project renders as
     * a "+ Add project" hover affordance (matches `dashboard.html:2930`).
     */
    onEdit?: () => void;
  }

  const { project, onEdit }: Props = $props();
  const editable = $derived(onEdit !== undefined);

  const short = $derived(projectShort(project));
  const color = $derived(projectColor(short));
  const fullTitle = $derived(project && short && project !== short ? project : null);
</script>

{#if short && editable}
  <button
    type="button"
    class="project-pill cyclable"
    style:--project-color={color}
    title={fullTitle ?? `Project: ${short} (click to change)`}
    aria-label="project {short} (click to change)"
    data-testid="project-pill"
    onclick={onEdit}
  >
    {short}
  </button>
{:else if short}
  <span
    class="project-pill"
    style:--project-color={color}
    title={fullTitle}
    aria-label="project {short}"
  >
    {short}
  </span>
{:else if editable}
  <button
    type="button"
    class="project-pill project-empty"
    aria-label="Add project"
    title="Add project"
    data-testid="project-add"
    onclick={onEdit}
  >
    + Project
  </button>
{/if}

<style>
  .project-pill {
    --project-color: var(--text-muted);
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--project-color);
    color: #ffffff;
    line-height: 1.4;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
    font-family: inherit;
    user-select: none;
  }

  button.project-pill {
    appearance: none;
    border: 0;
    cursor: pointer;
    font: inherit;
    font-size: 10px;
    font-weight: 600;
  }

  .project-empty {
    background: transparent;
    color: var(--text-muted);
    border: 1px dashed var(--border);
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  :global(.task-card:hover) .project-empty,
  .project-empty:focus-visible {
    opacity: 1;
  }
</style>
