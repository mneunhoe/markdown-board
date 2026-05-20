<script lang="ts">
  import { ModalShell, projectColor, projectColorHex } from '@markdown-board/ui';
  import {
    AUTOSAVE_DELAY_MAX,
    AUTOSAVE_DELAY_MIN,
    GRAMMAR_PROFILES,
    THEME_CHOICES,
    type GrammarProfile,
    type Settings,
    type ThemeChoice,
  } from '../lib/settings.js';
  import { DEFAULT_SHORTCUTS, normaliseCombo, resolveShortcuts } from '../lib/shortcuts.js';
  import type { ThemeStatus } from '../lib/theme/index.js';

  interface Props {
    open: boolean;
    settings: Settings;
    onChange: (next: Settings) => void;
    onClose: () => void;
    vaultPath?: string | null;
    themeStatus?: ThemeStatus;
    /** Distinct short project names to offer colour overrides for. */
    projects?: string[];
    onReloadTheme?: () => void;
  }

  const {
    open,
    settings,
    onChange,
    onClose,
    vaultPath = null,
    themeStatus = { state: 'none', errors: [] },
    projects = [],
    onReloadTheme,
  }: Props = $props();

  const THEME_LABELS: Record<ThemeChoice, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  };

  const COMMAND_LABELS: Record<string, string> = {
    'command-palette': 'Command palette',
    search: 'Search',
    'quick-add': 'Quick-add task',
    'open-vault': 'Open vault',
    'open-settings': 'Settings',
    'toggle-theme': 'Toggle theme',
    'go-board': 'Go to Board',
    'go-list': 'Go to List',
    'go-library': 'Go to Library',
    'go-overview': 'Go to Overview',
  };
  const SHORTCUT_IDS = Object.keys(DEFAULT_SHORTCUTS);

  const effectiveShortcuts = $derived(resolveShortcuts(settings.shortcuts));

  function setTheme(theme: ThemeChoice): void {
    onChange({ ...settings, theme });
  }

  function setGrammar(profile: GrammarProfile): void {
    onChange({ ...settings, grammarProfile: profile });
  }

  function setAutosave(value: number): void {
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(AUTOSAVE_DELAY_MAX, Math.max(AUTOSAVE_DELAY_MIN, Math.round(value)));
    onChange({ ...settings, autosaveDelayMs: clamped });
  }

  function setShortcut(id: string, raw: string): void {
    const next = { ...settings.shortcuts };
    const trimmed = raw.trim();
    // Empty input unbinds the command; a value is stored normalised.
    next[id] = trimmed === '' ? '' : normaliseCombo(trimmed);
    onChange({ ...settings, shortcuts: next });
  }

  function resetShortcut(id: string): void {
    const next = { ...settings.shortcuts };
    delete next[id];
    onChange({ ...settings, shortcuts: next });
  }

  function setProjectColor(name: string, hex: string): void {
    onChange({
      ...settings,
      projectColorOverrides: { ...settings.projectColorOverrides, [name]: hex },
    });
  }

  function resetProjectColor(name: string): void {
    const next = { ...settings.projectColorOverrides };
    delete next[name];
    onChange({ ...settings, projectColorOverrides: next });
  }
</script>

<ModalShell {open} title="Settings" {onClose}>
  <section class="settings-section">
    <h4 class="section-title">Theme</h4>
    <div class="radio-group" role="radiogroup" aria-label="Theme">
      {#each THEME_CHOICES as theme (theme)}
        <label class="radio-row">
          <input
            type="radio"
            name="theme"
            value={theme}
            checked={settings.theme === theme}
            data-testid="theme-{theme}"
            onchange={() => setTheme(theme)}
          />
          <span>{THEME_LABELS[theme]}</span>
        </label>
      {/each}
    </div>
    <p class="hint"><strong>System</strong> follows your OS preference and updates live.</p>

    <div class="custom-theme">
      <span class="custom-theme-status" data-testid="theme-status" data-state={themeStatus.state}>
        {#if themeStatus.state === 'active'}
          Custom theme active{themeStatus.name ? `: ${themeStatus.name}` : ''}
        {:else if themeStatus.state === 'error'}
          Custom theme has problems
        {:else}
          No custom theme — add a <code>theme.yaml</code> to the vault root
        {/if}
      </span>
      <button
        type="button"
        class="ghost-btn"
        data-testid="theme-reload"
        onclick={() => onReloadTheme?.()}
      >
        Reload theme
      </button>
    </div>
    {#if themeStatus.state === 'error' && themeStatus.errors.length > 0}
      <ul class="error-list" data-testid="theme-errors">
        {#each themeStatus.errors as err, i (i)}
          <li>{err}</li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if vaultPath}
    <section class="settings-section">
      <h4 class="section-title">Vault</h4>
      <p class="mono-value" data-testid="vault-path">{vaultPath}</p>
    </section>
  {/if}

  <section class="settings-section">
    <h4 class="section-title">Autosave delay</h4>
    <div class="inline-field">
      <input
        type="number"
        min={AUTOSAVE_DELAY_MIN}
        max={AUTOSAVE_DELAY_MAX}
        step="50"
        value={settings.autosaveDelayMs}
        data-testid="autosave-delay"
        onchange={(e) => setAutosave(e.currentTarget.valueAsNumber)}
      />
      <span class="unit">ms</span>
    </div>
    <p class="hint">How long to wait after an edit before writing to disk.</p>
  </section>

  <section class="settings-section">
    <h4 class="section-title">Grammar profile</h4>
    <select
      class="select"
      data-testid="grammar-profile"
      onchange={(e) => setGrammar(e.currentTarget.value as GrammarProfile)}
    >
      {#each GRAMMAR_PROFILES as profile (profile)}
        <option value={profile} selected={profile === settings.grammarProfile}>{profile}</option>
      {/each}
    </select>
    <p class="hint">How task tokens (priority, day, project) are read and written.</p>
  </section>

  {#if projects.length > 0}
    <section class="settings-section">
      <h4 class="section-title">Project colours</h4>
      <div class="project-grid">
        {#each projects as name (name)}
          <span
            class="project-swatch"
            style:background={projectColor(name, settings.projectColorOverrides)}
            aria-hidden="true"
          ></span>
          <span class="project-name">{name}</span>
          <input
            type="color"
            class="color-input"
            value={projectColorHex(name, settings.projectColorOverrides)}
            data-testid="project-color-{name}"
            aria-label="Colour for {name}"
            oninput={(e) => setProjectColor(name, e.currentTarget.value)}
          />
          <button
            type="button"
            class="ghost-btn"
            data-testid="project-color-reset-{name}"
            disabled={!(name in settings.projectColorOverrides)}
            onclick={() => resetProjectColor(name)}
          >
            Reset
          </button>
        {/each}
      </div>
      <p class="hint">Override the auto-assigned colour for a project.</p>
    </section>
  {/if}

  <section class="settings-section">
    <h4 class="section-title">Keyboard shortcuts</h4>
    <div class="shortcut-grid">
      {#each SHORTCUT_IDS as id (id)}
        <label class="shortcut-label" for="sc-{id}">{COMMAND_LABELS[id] ?? id}</label>
        <input
          id="sc-{id}"
          class="shortcut-input"
          type="text"
          value={effectiveShortcuts[id] ?? ''}
          placeholder="unbound"
          data-testid="shortcut-{id}"
          onchange={(e) => setShortcut(id, e.currentTarget.value)}
        />
        <button
          type="button"
          class="ghost-btn"
          data-testid="shortcut-reset-{id}"
          disabled={!(id in settings.shortcuts)}
          onclick={() => resetShortcut(id)}
        >
          Reset
        </button>
      {/each}
    </div>
    <p class="hint">
      Use <code>Mod</code> for ⌘/Ctrl, e.g. <code>Mod+Shift+L</code>. Leave blank to unbind.
    </p>
  </section>

  <section class="settings-section">
    <h4 class="section-title">Plugins</h4>
    <p class="hint" data-testid="plugins-placeholder">
      Per-plugin enable/disable arrives with the plugin system in a later release.
    </p>
  </section>
</ModalShell>

<style>
  .settings-section {
    padding: 4px 0 16px;
  }

  .settings-section + .settings-section {
    border-top: 1px solid var(--border-light);
    padding-top: 16px;
  }

  .section-title {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .radio-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: var(--text-primary);
    cursor: pointer;
  }

  .radio-row input {
    margin: 0;
    cursor: pointer;
  }

  .mono-value {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }

  .custom-theme {
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .custom-theme-status {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .custom-theme-status[data-state='error'] {
    color: var(--priority-high);
  }

  .error-list {
    margin: 8px 0 0;
    padding-left: 18px;
    font-size: 12px;
    color: var(--priority-high);
  }

  .ghost-btn {
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

  .ghost-btn:hover:not(:disabled) {
    border-color: var(--accent);
  }

  .ghost-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .inline-field {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .inline-field input,
  .select {
    appearance: auto;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    font-size: 14px;
    padding: 6px 10px;
    border-radius: 6px;
  }

  .inline-field input {
    width: 100px;
  }

  .unit {
    font-size: 13px;
    color: var(--text-muted);
  }

  .shortcut-grid {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 8px 12px;
    align-items: center;
  }

  .project-grid {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 8px 12px;
    align-items: center;
  }

  .project-swatch {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    display: inline-block;
  }

  .project-name {
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .color-input {
    width: 36px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-card);
    cursor: pointer;
  }

  .shortcut-label {
    font-size: 13px;
    color: var(--text-primary);
  }

  .shortcut-input {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 5px 8px;
    border-radius: 6px;
    width: 150px;
  }

  .hint {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .hint code {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 1px 5px;
    background: var(--bg-secondary);
    border-radius: 3px;
  }
</style>
