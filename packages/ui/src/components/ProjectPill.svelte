<script lang="ts">
  import { projectShort, projectColor } from '../lib/project.js';

  interface Props {
    /** Full project tag exactly as it sits on `Task.project` (may include
     * an em-dash / en-dash / colon suffix). The pill displays the short
     * prefix; the full tag is surfaced as a tooltip when it differs. */
    project: string | null;
  }

  const { project }: Props = $props();

  const short = $derived(projectShort(project));
  const color = $derived(projectColor(short));
  const fullTitle = $derived(project && short && project !== short ? project : null);
</script>

{#if short}
  <span
    class="project-pill"
    style:--project-color={color}
    title={fullTitle}
    aria-label="project {short}"
  >
    {short}
  </span>
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
</style>
