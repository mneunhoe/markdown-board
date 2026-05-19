<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';

  let tauriVersion = $state<string | null>(null);
  let tauriError = $state<string | null>(null);

  // Probes the Tauri IPC bridge so the placeholder visibly distinguishes
  // "running inside Tauri" from "loaded in a plain browser via `pnpm dev`".
  getVersion()
    .then((v) => {
      tauriVersion = v;
    })
    .catch((err: unknown) => {
      tauriError = err instanceof Error ? err.message : String(err);
    });
</script>

<main>
  <h1>markdown-board <span class="tag">desktop</span></h1>
  <p class="lede">
    Tauri 2 shell scaffold. The vault picker, file watcher, and board / list / library views land in
    subsequent Phase 2 slices.
  </p>

  <section class="card">
    <h2>Tauri IPC probe</h2>
    {#if tauriVersion}
      <p class="ok">Connected — Tauri runtime <code>{tauriVersion}</code>.</p>
    {:else if tauriError}
      <p class="warn">
        IPC unavailable ({tauriError}). This is expected when running
        <code>pnpm dev</code> in a plain browser; open the window via
        <code>pnpm tauri dev</code> to exercise the bridge.
      </p>
    {:else}
      <p class="muted">Probing&hellip;</p>
    {/if}
  </section>
</main>

<style>
  main {
    max-width: 640px;
    margin: 4rem auto;
    padding: 0 1.5rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1f2933;
    line-height: 1.5;
  }
  h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem;
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }
  .tag {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: #e0e7ff;
    color: #3730a3;
  }
  .lede {
    color: #52606d;
    margin: 0 0 2rem;
  }
  .card {
    border: 1px solid #d9e2ec;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    background: #ffffff;
  }
  .card h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .ok {
    color: #15803d;
    margin: 0;
  }
  .warn {
    color: #b45309;
    margin: 0;
  }
  .muted {
    color: #829ab1;
    margin: 0;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #f1f5f9;
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    font-size: 0.95em;
  }
</style>
