import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConflictModal from '../../src/components/ConflictModal.svelte';

const props = {
  open: true,
  base: 'BASE',
  mine: 'MINE-content',
  theirs: 'THEIRS-content',
  onKeepMine: () => {},
  onTakeTheirs: () => {},
  onApplyMerge: () => {},
};

describe('ConflictModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden when open is false', () => {
    const { container } = render(ConflictModal, { ...props, open: false });
    expect(container.querySelector('[data-testid="conflict-mine"]')).toBeNull();
  });

  it('shows mine and theirs', () => {
    const { container } = render(ConflictModal, props);
    expect(container.querySelector('[data-testid="conflict-mine"]')?.textContent).toContain(
      'MINE-content',
    );
    expect(container.querySelector('[data-testid="conflict-theirs"]')?.textContent).toContain(
      'THEIRS-content',
    );
  });

  it('seeds the merge editor with theirs', () => {
    const { container } = render(ConflictModal, props);
    const merge = container.querySelector<HTMLTextAreaElement>('[data-testid="conflict-merge"]');
    expect(merge?.value).toBe('THEIRS-content');
  });

  it('fires keep-mine and take-theirs', async () => {
    const onKeepMine = vi.fn();
    const onTakeTheirs = vi.fn();
    const { container } = render(ConflictModal, { ...props, onKeepMine, onTakeTheirs });
    await fireEvent.click(container.querySelector('[data-testid="conflict-keep-mine"]')!);
    await fireEvent.click(container.querySelector('[data-testid="conflict-take-theirs"]')!);
    expect(onKeepMine).toHaveBeenCalledOnce();
    expect(onTakeTheirs).toHaveBeenCalledOnce();
  });

  it('applies the edited merge text', async () => {
    const onApplyMerge = vi.fn();
    const { container } = render(ConflictModal, { ...props, onApplyMerge });
    const merge = container.querySelector<HTMLTextAreaElement>('[data-testid="conflict-merge"]')!;
    await fireEvent.input(merge, { target: { value: 'MERGED-result' } });
    await fireEvent.click(container.querySelector('[data-testid="conflict-apply-merge"]')!);
    expect(onApplyMerge).toHaveBeenCalledWith('MERGED-result');
  });

  it('reveals the base version on demand', async () => {
    const { container } = render(ConflictModal, props);
    expect(container.querySelector('[data-testid="conflict-base"]')).toBeNull();
    await fireEvent.click(container.querySelector('.link-btn')!);
    expect(container.querySelector('[data-testid="conflict-base"]')?.textContent).toContain('BASE');
  });
});
