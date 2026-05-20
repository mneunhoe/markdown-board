<script lang="ts">
  import { TABS, type TabKey } from '../lib/tabs.js';

  interface Props {
    active: TabKey;
    onSelect: (key: TabKey) => void;
  }

  const { active, onSelect }: Props = $props();
</script>

<div class="tab-bar" role="tablist" aria-label="Vault views">
  {#each TABS as tab (tab.key)}
    <button
      type="button"
      role="tab"
      class="tab"
      class:active={active === tab.key}
      aria-selected={active === tab.key}
      data-tab={tab.key}
      onclick={() => onSelect(tab.key)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tab-bar {
    display: flex;
    gap: 4px;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }

  .tab {
    appearance: none;
    background: transparent;
    border: 0;
    border-bottom: 2px solid transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 10px 14px;
    margin-bottom: -1px;
    transition:
      color 0.15s ease,
      border-color 0.15s ease;
  }

  .tab:hover {
    color: var(--text-primary);
  }

  .tab.active {
    color: var(--text-primary);
    border-bottom-color: var(--accent);
  }

  .tab:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
