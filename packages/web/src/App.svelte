<script lang="ts">
  import { EmptyState } from '@markdown-board/ui';
</script>

<main class="shell">
  <header class="topbar">
    <h1 class="brand">markdown-board</h1>
  </header>

  <section class="body">
    <EmptyState
      title="No vault open"
      hint="Vault picker, autosave, and views land in the next sub-slices of Phase 1 task 4."
    />
  </section>
</main>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .topbar {
    border-bottom: 1px solid var(--border);
    padding: 12px 20px;
    background: var(--bg-secondary);
  }

  .brand {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
