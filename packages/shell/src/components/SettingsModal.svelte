<script lang="ts">
  import { ModalShell } from '@markdown-board/ui';
  import {
    GRAMMAR_PROFILES,
    THEME_CHOICES,
    type Settings,
    type ThemeChoice,
  } from '../lib/settings.js';

  interface Props {
    open: boolean;
    settings: Settings;
    onChange: (next: Settings) => void;
    onClose: () => void;
  }

  const { open, settings, onChange, onClose }: Props = $props();

  function setTheme(theme: ThemeChoice): void {
    onChange({ ...settings, theme });
  }

  const THEME_LABELS: Record<ThemeChoice, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  };
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
    <p class="hint">
      <strong>System</strong> follows your OS preference and updates live.
    </p>
  </section>

  <section class="settings-section">
    <h4 class="section-title">Grammar profile</h4>
    <div class="profile-row">
      <span class="profile-name" data-testid="grammar-profile">
        {settings.grammarProfile}
      </span>
      <span class="profile-tag">
        {GRAMMAR_PROFILES.length === 1
          ? 'only option in v1'
          : `${GRAMMAR_PROFILES.length} profiles`}
      </span>
    </div>
    <p class="hint">
      Custom profiles for renamed tokens (e.g. <code>[priority:high]</code>) ship in a future
      release.
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

  .profile-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .profile-name {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 14px;
    padding: 4px 10px;
    background: var(--bg-secondary);
    border-radius: 6px;
    color: var(--text-primary);
  }

  .profile-tag {
    font-size: 12px;
    color: var(--text-muted);
  }

  .hint {
    margin: 10px 0 0;
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .hint code {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 11px;
    padding: 1px 5px;
    background: var(--bg-secondary);
    border-radius: 3px;
  }
</style>
