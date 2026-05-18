import { render, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ModalShell from '../../src/components/ModalShell.svelte';

describe('ModalShell', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(ModalShell, { open: false, title: 'Resolve task' });
    expect(container.querySelector('.modal-overlay')).toBeNull();
  });

  it('renders the overlay + modal when open is true', () => {
    const { container } = render(ModalShell, { open: true, title: 'Resolve task' });
    expect(container.querySelector('.modal-overlay')).not.toBeNull();
    expect(container.querySelector('.modal')).not.toBeNull();
  });

  it('renders the title in the header', () => {
    const { container } = render(ModalShell, { open: true, title: 'Resolve task' });
    expect(container.querySelector('.modal-header h3')?.textContent?.trim()).toBe('Resolve task');
  });

  it('exposes role=dialog and aria-modal=true with the title as aria-label', () => {
    const { container } = render(ModalShell, { open: true, title: 'Resolve task' });
    const overlay = container.querySelector('.modal-overlay');
    expect(overlay?.getAttribute('role')).toBe('dialog');
    expect(overlay?.getAttribute('aria-modal')).toBe('true');
    expect(overlay?.getAttribute('aria-label')).toBe('Resolve task');
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(ModalShell, { open: true, title: 'Resolve task', onClose });
    const closeBtn = container.querySelector<HTMLButtonElement>('.modal-close');
    expect(closeBtn).not.toBeNull();
    await fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(ModalShell, { open: true, title: 'Resolve task', onClose });
    const overlay = container.querySelector<HTMLElement>('.modal-overlay');
    await fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the modal body is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(ModalShell, { open: true, title: 'Resolve task', onClose });
    const modal = container.querySelector<HTMLElement>('.modal');
    await fireEvent.click(modal!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed on the window', async () => {
    const onClose = vi.fn();
    render(ModalShell, { open: true, title: 'Resolve task', onClose });
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for unrelated keys', async () => {
    const onClose = vi.fn();
    render(ModalShell, { open: true, title: 'Resolve task', onClose });
    await fireEvent.keyDown(window, { key: 'Enter' });
    await fireEvent.keyDown(window, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not respond to Escape when open is false', async () => {
    const onClose = vi.fn();
    render(ModalShell, { open: false, title: 'Resolve task', onClose });
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
