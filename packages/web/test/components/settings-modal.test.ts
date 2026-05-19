import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SettingsModal from '../../src/components/SettingsModal.svelte';
import { DEFAULT_SETTINGS } from '../../src/lib/settings.js';

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
      settings: { theme: 'dark', grammarProfile: 'default' },
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
      settings: { theme: 'system', grammarProfile: 'default' },
      onChange,
      onClose: () => {},
    });
    const darkRadio = container.querySelector<HTMLInputElement>('[data-testid="theme-dark"]');
    await fireEvent.click(darkRadio!);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark', grammarProfile: 'default' });
  });

  it('preserves the grammar profile when the theme changes', async () => {
    const onChange = vi.fn();
    const { container } = render(SettingsModal, {
      open: true,
      settings: { theme: 'light', grammarProfile: 'default' },
      onChange,
      onClose: () => {},
    });
    const darkRadio = container.querySelector<HTMLInputElement>('[data-testid="theme-dark"]');
    await fireEvent.click(darkRadio!);
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark', grammarProfile: 'default' });
  });

  it('displays the current grammar profile name', () => {
    const { container } = render(SettingsModal, {
      open: true,
      settings: DEFAULT_SETTINGS,
      onChange: () => {},
      onClose: () => {},
    });
    expect(container.querySelector('[data-testid="grammar-profile"]')?.textContent?.trim()).toBe(
      'default',
    );
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
});
