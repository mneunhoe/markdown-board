<script lang="ts">
  import type { PluginManifest, SettingsField } from '@markdown-board/plugin-api';
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
  import { resolvePluginSettings } from '../lib/plugins/plugin-settings.js';
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
    /** Discovered plugins (manifests) to list with enable/disable + settings. */
    plugins?: readonly PluginManifest[];
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
    plugins = [],
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

  // ── Plugins ──────────────────────────────────────────────────────────────
  function pluginEnabled(id: string): boolean {
    return settings.plugins[id]?.enabled !== false;
  }

  function setPluginEnabled(id: string, enabled: boolean): void {
    const prev = settings.plugins[id] ?? { enabled: true };
    onChange({ ...settings, plugins: { ...settings.plugins, [id]: { ...prev, enabled } } });
  }

  function pluginValue(manifest: PluginManifest, key: string): unknown {
    return resolvePluginSettings(manifest.settings, settings.plugins[manifest.id])[key];
  }

  function setPluginValue(id: string, key: string, value: unknown): void {
    const prev = settings.plugins[id] ?? { enabled: true };
    onChange({
      ...settings,
      plugins: { ...settings.plugins, [id]: { ...prev, [key]: value } },
    });
  }

  function clampField(field: SettingsField, value: number): number {
    let n = value;
    if (field.type === 'number') {
      if (field.min !== undefined) n = Math.max(field.min, n);
      if (field.max !== undefined) n = Math.min(field.max, n);
    }
    return n;
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
    {#if plugins.length === 0}
      <p class="hint" data-testid="plugins-empty">No plugins installed.</p>
    {:else}
      <ul class="plugin-list">
        {#each plugins as manifest (manifest.id)}
          {@const enabled = pluginEnabled(manifest.id)}
          <li class="plugin-row" data-plugin={manifest.id}>
            <div class="plugin-head">
              <label class="plugin-toggle">
                <input
                  type="checkbox"
                  checked={enabled}
                  data-testid="plugin-toggle-{manifest.id}"
                  onchange={(e) => setPluginEnabled(manifest.id, e.currentTarget.checked)}
                />
                <span class="plugin-name">{manifest.name}</span>
                <span class="plugin-version">v{manifest.version}</span>
              </label>
            </div>
            {#if manifest.description}
              <p class="hint plugin-desc">{manifest.description}</p>
            {/if}
            {#if enabled && manifest.settings && manifest.settings.length > 0}
              <div class="plugin-settings">
                {#each manifest.settings as field (field.key)}
                  <label class="plugin-field">
                    <span class="plugin-field-label">{field.label}</span>
                    {#if field.type === 'boolean'}
                      <input
                        type="checkbox"
                        checked={Boolean(pluginValue(manifest, field.key))}
                        data-testid="plugin-{manifest.id}-{field.key}"
                        onchange={(e) =>
                          setPluginValue(manifest.id, field.key, e.currentTarget.checked)}
                      />
                    {:else if field.type === 'number'}
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={Number(pluginValue(manifest, field.key))}
                        data-testid="plugin-{manifest.id}-{field.key}"
                        onchange={(e) =>
                          setPluginValue(
                            manifest.id,
                            field.key,
                            clampField(field, Number(e.currentTarget.value)),
                          )}
                      />
                    {:else}
                      <input
                        type="text"
                        value={String(pluginValue(manifest, field.key) ?? '')}
                        data-testid="plugin-{manifest.id}-{field.key}"
                        onchange={(e) =>
                          setPluginValue(manifest.id, field.key, e.currentTarget.value)}
                      />
                    {/if}
                  </label>
                {/each}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
      <p class="hint">Plugins run in-process with full access to your vault.</p>
    {/if}
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

  .plugin-list {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .plugin-toggle {
    display: flex;
    align-items: baseline;
    gap: 8px;
    cursor: pointer;
  }

  .plugin-name {
    font-weight: 600;
    font-size: 13px;
  }

  .plugin-version {
    font-size: 11px;
    color: var(--text-muted);
  }

  .plugin-desc {
    margin: 4px 0 0 22px;
  }

  .plugin-settings {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 8px 0 0 22px;
  }

  .plugin-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
  }

  .plugin-field input[type='number'],
  .plugin-field input[type='text'] {
    width: 80px;
    padding: 3px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 12px;
  }

  .plugin-field input[type='text'] {
    width: 160px;
  }
</style>
