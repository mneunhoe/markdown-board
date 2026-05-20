<script lang="ts">
  // Test fixture: a stand-in plugin view that proves the view context is
  // wired — it reads the live vault from the context and renders the first
  // task title.
  import { getViewContext } from '@markdown-board/ui';

  const ctx = getViewContext();
  const firstTitle = $derived(ctx.getVault().sections[0]?.tasks[0]?.title ?? '(none)');
</script>

<div data-testid="plugin-view-probe">probe: {firstTitle}</div>
