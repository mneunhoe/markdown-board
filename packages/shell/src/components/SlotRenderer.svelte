<script lang="ts">
  // Renders a plugin-contributed component (header/toolbar slot or view).
  // Wrapping the dynamic component in a real component gives `{#each}` /
  // `{#if}` blocks a stable child to mount — a bare `{@const C = …}<C />` as the
  // sole block body doesn't reliably materialise on a reactive append.
  import type { PluginComponent } from '@markdown-board/plugin-api';

  const { component }: { component: PluginComponent } = $props();
  const Component = $derived(component);
</script>

<Component />
