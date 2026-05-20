import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ResolveModal from '../../src/components/ResolveModal.svelte';

describe('ResolveModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden when taskTitle is null', () => {
    const { container } = render(ResolveModal, {
      taskTitle: null,
      onConfirm: () => {},
      onCancel: () => {},
    });
    expect(container.querySelector('.modal-overlay')).toBeNull();
  });

  it('renders the task title when open', () => {
    const { container } = render(ResolveModal, {
      taskTitle: 'Ship the demo',
      onConfirm: () => {},
      onCancel: () => {},
    });
    expect(container.querySelector('[data-testid="resolve-task-title"]')?.textContent?.trim()).toBe(
      'Ship the demo',
    );
  });

  it('calls onConfirm with the textarea contents on Resolve click', async () => {
    const onConfirm = vi.fn();
    const { container } = render(ResolveModal, {
      taskTitle: 'Ship the demo',
      onConfirm,
      onCancel: () => {},
    });
    const textarea = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="resolve-textarea"]',
    );
    await fireEvent.input(textarea!, { target: { value: 'Done, shipped Friday' } });
    const confirmBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="resolve-confirm"]',
    );
    await fireEvent.click(confirmBtn!);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith('Done, shipped Friday');
  });

  it('calls onConfirm with an empty string when the textarea is left blank', async () => {
    const onConfirm = vi.fn();
    const { container } = render(ResolveModal, {
      taskTitle: 'Ship the demo',
      onConfirm,
      onCancel: () => {},
    });
    const confirmBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="resolve-confirm"]',
    );
    await fireEvent.click(confirmBtn!);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('calls onCancel when the Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const { container } = render(ResolveModal, {
      taskTitle: 'Ship the demo',
      onConfirm: () => {},
      onCancel,
    });
    const cancelBtn = container.querySelector<HTMLButtonElement>('[data-testid="resolve-cancel"]');
    await fireEvent.click(cancelBtn!);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm on Cmd/Ctrl + Enter inside the textarea', async () => {
    const onConfirm = vi.fn();
    const { container } = render(ResolveModal, {
      taskTitle: 'Ship the demo',
      onConfirm,
      onCancel: () => {},
    });
    const textarea = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="resolve-textarea"]',
    );
    await fireEvent.input(textarea!, { target: { value: 'Shipped' } });
    await fireEvent.keyDown(textarea!, { key: 'Enter', metaKey: true });
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith('Shipped');
  });

  it('does not call onConfirm on plain Enter (newline in textarea)', async () => {
    const onConfirm = vi.fn();
    const { container } = render(ResolveModal, {
      taskTitle: 'Ship the demo',
      onConfirm,
      onCancel: () => {},
    });
    const textarea = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="resolve-textarea"]',
    );
    await fireEvent.keyDown(textarea!, { key: 'Enter' });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
