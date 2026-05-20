import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import QuickAddModal from '../../src/components/QuickAddModal.svelte';

const sections = [
  { id: 'active', name: 'Active' },
  { id: 'later', name: 'Later' },
];

describe('QuickAddModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden when open is false', () => {
    const { container } = render(QuickAddModal, {
      open: false,
      sections,
      onAdd: () => {},
      onClose: () => {},
    });
    expect(container.querySelector('[data-testid="quick-add-title"]')).toBeNull();
  });

  it('lists the sections to choose from', () => {
    const { container } = render(QuickAddModal, {
      open: true,
      sections,
      onAdd: () => {},
      onClose: () => {},
    });
    const options = container.querySelectorAll('[data-testid="quick-add-section"] option');
    expect([...options].map((o) => o.textContent?.trim())).toEqual(['Active', 'Later']);
  });

  it('disables Add until a title is entered', async () => {
    const { container } = render(QuickAddModal, {
      open: true,
      sections,
      onAdd: () => {},
      onClose: () => {},
    });
    const confirm = container.querySelector<HTMLButtonElement>(
      '[data-testid="quick-add-confirm"]',
    )!;
    expect(confirm.disabled).toBe(true);
    await fireEvent.input(container.querySelector('[data-testid="quick-add-title"]')!, {
      target: { value: 'Write tests' },
    });
    expect(confirm.disabled).toBe(false);
  });

  it('adds to the chosen section and closes on confirm', async () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    const { container } = render(QuickAddModal, {
      open: true,
      sections,
      onAdd,
      onClose,
    });
    await fireEvent.input(container.querySelector('[data-testid="quick-add-title"]')!, {
      target: { value: 'Write tests' },
    });
    await fireEvent.change(container.querySelector('[data-testid="quick-add-section"]')!, {
      target: { value: 'later' },
    });
    await fireEvent.click(container.querySelector('[data-testid="quick-add-confirm"]')!);
    expect(onAdd).toHaveBeenCalledWith('later', 'Write tests');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('submits on Enter in the title field', async () => {
    const onAdd = vi.fn();
    const { container } = render(QuickAddModal, {
      open: true,
      sections,
      onAdd,
      onClose: () => {},
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="quick-add-title"]')!;
    await fireEvent.input(input, { target: { value: 'Quick one' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAdd).toHaveBeenCalledWith('active', 'Quick one');
  });
});
