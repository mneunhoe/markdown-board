import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CommandPalette from '../../src/components/CommandPalette.svelte';
import type { Command } from '../../src/lib/commands.js';

function makeCommands(run = vi.fn()): Command[] {
  return [
    { id: 'open', title: 'Open vault', run },
    { id: 'settings', title: 'Open settings', group: 'App', run },
    { id: 'theme', title: 'Toggle light / dark theme', run },
  ];
}

describe('CommandPalette', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden when open is false', () => {
    const { container } = render(CommandPalette, {
      open: false,
      commands: makeCommands(),
      onClose: () => {},
    });
    expect(container.querySelector('[data-testid="palette-input"]')).toBeNull();
  });

  it('lists all commands when open with no query', () => {
    const { container } = render(CommandPalette, {
      open: true,
      commands: makeCommands(),
      onClose: () => {},
    });
    expect(container.querySelectorAll('[data-testid="palette-item"]')).toHaveLength(3);
  });

  it('filters commands as the query changes', async () => {
    const { container } = render(CommandPalette, {
      open: true,
      commands: makeCommands(),
      onClose: () => {},
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="palette-input"]')!;
    await fireEvent.input(input, { target: { value: 'theme' } });
    const items = container.querySelectorAll('[data-testid="palette-item"]');
    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain('Toggle light / dark theme');
  });

  it('shows an empty message when nothing matches', async () => {
    const { container } = render(CommandPalette, {
      open: true,
      commands: makeCommands(),
      onClose: () => {},
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="palette-input"]')!;
    await fireEvent.input(input, { target: { value: 'zzzzz' } });
    expect(container.querySelector('[data-testid="palette-empty"]')).toBeTruthy();
  });

  it('runs a command and closes when clicked', async () => {
    const run = vi.fn();
    const onClose = vi.fn();
    const { container } = render(CommandPalette, {
      open: true,
      commands: makeCommands(run),
      onClose,
    });
    const first = container.querySelector<HTMLButtonElement>('[data-testid="palette-item"]')!;
    await fireEvent.click(first);
    expect(onClose).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledOnce();
  });

  it('runs the selected command on Enter and navigates with arrows', async () => {
    const run = vi.fn();
    const { container } = render(CommandPalette, {
      open: true,
      commands: makeCommands(run),
      onClose: () => {},
    });
    const overlay = container.querySelector<HTMLElement>('[role="dialog"]')!;
    await fireEvent.keyDown(overlay, { key: 'ArrowDown' });
    await fireEvent.keyDown(overlay, { key: 'Enter' });
    expect(run).toHaveBeenCalledOnce();
    // Second item selected after one ArrowDown.
    const items = container.querySelectorAll('[data-testid="palette-item"]');
    expect(items[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const { container } = render(CommandPalette, {
      open: true,
      commands: makeCommands(),
      onClose,
    });
    const overlay = container.querySelector<HTMLElement>('[role="dialog"]')!;
    await fireEvent.keyDown(overlay, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
