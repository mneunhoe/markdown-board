<script lang="ts">
  // View-toolbar button: builds the week's .ics from the live vault and hands
  // it to the host's saveFile (web download / desktop save dialog). Registers
  // its export closure so the palette command can trigger the same action.
  import { getViewContext } from '@markdown-board/ui';

  import { buildICalForWeek, icalFilename } from './ical.js';
  import { getApi, setExporter } from './context.js';

  const view = getViewContext();

  function doExport(): void {
    const ics = buildICalForWeek(view.getVault());
    const api = getApi();
    if (!ics) {
      api?.ui.notify('No scheduled tasks this week to export.');
      return;
    }
    void api?.ui.saveFile(icalFilename(), ics, 'text/calendar');
    api?.ui.notify('Exported this week to .ics');
  }

  $effect(() => {
    setExporter(doExport);
    return () => setExporter(null);
  });
</script>

<button type="button" class="ical-export-btn" data-testid="ical-export" onclick={doExport}>
  ↓ Export week (.ics)
</button>

<style>
  .ical-export-btn {
    appearance: none;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 12px;
    padding: 4px 10px;
  }

  .ical-export-btn:hover {
    color: var(--text-primary);
    border-color: var(--accent);
  }
</style>
