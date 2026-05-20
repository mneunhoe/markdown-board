import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SettingsModal from '../../src/components/SettingsModal.svelte';
import { DEFAULT_SETTINGS, type Settings } from '../../src/lib/settings.js';

const settingsWith = (overrides: Partial<Settings>): Settings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
});

describe('SettingsModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden when open is false', () => {
    const { container } = render(SettingsModal, {
      open: false,
      settings: DEFAULT_SETTINGS,
      onChange: () => {},
      onClose: () => {},
    });
    expect(container.querySelector('.modal-overlay')).toBeNull();
  });

  it('renders three theme options when open', () => {
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      onChange: () => {},
      onClose: () => {},
    });
    expect(container.querySelector('[data-testid="theme-system"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="theme-light"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="theme-dark"]')).toBeTruthy();
  });

  it('marks the current theme as checked', () => {
    const { container } = render(SettingsModal, {
      open: true,
      settings: settingsWith({ theme: 'dark' }),
      onChange: () => {},
      onClose: () => {},
    });
    const dark = container.querySelector<HTMLInputElement>('[data-testid="theme-dark"]');
    const system = container.querySelector<HTMLInputElement>('[data-testid="theme-system"]');
    expect(dark?.checked).toBe(true);
    expect(system?.checked).toBe(false);
  });

  it('calls onChange with the new theme when a radio is clicked', async () => {
    const onChange = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: settingsWith({ theme: 'system' }),
      onChange,
      onClose: () => {},
    });
    const darkRadio = container.querySelector<HTMLInputElement>('[data-testid="theme-dark"]');
    await fireEvent.click(darkRadio!);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(settingsWith({ theme: 'dark' }));
  });

  it('preserves the grammar profile when the theme changes', async () => {
    const onChange = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: settingsWith({ theme: 'light', projectColorOverrides: { Foo: '#abc' } }),
      onChange,
      onClose: () => {},
    });
    const darkRadio = container.querySelector<HTMLInputElement>('[data-testid="theme-dark"]');
    await fireEvent.click(darkRadio!);
    expect(onChange).toHaveBeenCalledWith(
      settingsWith({ theme: 'dark', projectColorOverrides: { Foo: '#abc' } }),
    );
  });

  it('selects the current grammar profile', () => {
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      onChange: () => {},
      onClose: () => {},
    });
    const select = container.querySelector<HTMLSelectElement>('[data-testid="grammar-profile"]');
    expect(select?.value).toBe('default');
  });

  it('emits a grammar-profile change', async () => {
    const onChange = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      onChange,
      onClose: () => {},
    });
    const select = container.querySelector<HTMLSelectElement>('[data-testid="grammar-profile"]')!;
    await fireEvent.change(select, { target: { value: 'obsidian-tasks' } });
    expect(onChange).toHaveBeenCalledWith(settingsWith({ grammarProfile: 'obsidian-tasks' }));
  });

  it('calls onClose when the modal close button is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      onChange: () => {},
      onClose,
    });
    const closeBtn = container.querySelector<HTMLButtonElement>('.modal-close');
    await fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows the vault path when provided and hides the section otherwise', () => {
    const withPath = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      vaultPath: '/Users/me/vault',
      onChange: () => {},
      onClose: () => {},
    });
    expect(
      withPath.container.querySelector('[data-testid="vault-path"]')?.textContent?.trim(),
    ).toBe('/Users/me/vault');
    document.body.innerHTML = '';
    const without = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      onChange: () => {},
      onClose: () => {},
    });
    expect(without.container.querySelector('[data-testid="vault-path"]')).toBeNull();
  });

  it('reflects the custom-theme status and reload button', async () => {
    const onReloadTheme = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      themeStatus: { state: 'error', errors: ['bad colour'] },
      onReloadTheme,
      onChange: () => {},
      onClose: () => {},
    });
    expect(
      container.querySelector('[data-testid="theme-status"]')?.getAttribute('data-state'),
    ).toBe('error');
    expect(container.querySelector('[data-testid="theme-errors"]')?.textContent).toContain(
      'bad colour',
    );
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="theme-reload"]')!,
    );
    expect(onReloadTheme).toHaveBeenCalledOnce();
  });

  it('clamps and emits the autosave delay on change', async () => {
    const onChange = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      onChange,
      onClose: () => {},
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="autosave-delay"]')!;
    await fireEvent.change(input, { target: { value: '99999' } });
    expect(onChange).toHaveBeenCalledWith(settingsWith({ autosaveDelayMs: 10_000 }));
  });

  it('edits a keyboard shortcut and normalises the combo', async () => {
    const onChange = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      onChange,
      onClose: () => {},
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="shortcut-go-list"]')!;
    await fireEvent.change(input, { target: { value: 'shift+mod+l' } });
    expect(onChange).toHaveBeenCalledWith(
      settingsWith({ shortcuts: { 'go-list': 'Mod+Shift+L' } }),
    );
  });

  it('renders project-colour rows and emits an override on change', async () => {
    const onChange = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      projects: ['PSD_GAN', 'Alpha'],
      onChange,
      onClose: () => {},
    });
    expect(
      container.querySelectorAll('[data-testid^="project-color-PSD_GAN"]').length,
    ).toBeGreaterThan(0);
    const input = container.querySelector<HTMLInputElement>('[data-testid="project-color-Alpha"]')!;
    await fireEvent.input(input, { target: { value: '#123456' } });
    expect(onChange).toHaveBeenCalledWith(
      settingsWith({ projectColorOverrides: { Alpha: '#123456' } }),
    );
  });

  it('hides the project-colour section when there are no projects', () => {
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      onChange: () => {},
      onClose: () => {},
    });
    expect(container.querySelector('[data-testid^="project-color-"]')).toBeNull();
  });

  it('resets a shortcut override (enabled only when overridden)', async () => {
    const onChange = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: settingsWith({ shortcuts: { 'go-list': 'Mod+L' } }),
      onChange,
      onClose: () => {},
    });
    const resetBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="shortcut-reset-go-list"]',
    )!;
    expect(resetBtn.disabled).toBe(false);
    await fireEvent.click(resetBtn);
    expect(onChange).toHaveBeenCalledWith(settingsWith({ shortcuts: {} }));
  });
});
