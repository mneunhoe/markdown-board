import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ProjectPickerModal from '../../src/components/ProjectPickerModal.svelte';

describe('ProjectPickerModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(ProjectPickerModal, {
      open: false,
      current: null,
      suggestions: [],
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    expect(container.querySelector('[data-testid="project-picker-input"]')).toBeNull();
  });

  it('pre-fills the input with the current project when open', () => {
    const { container } = render(ProjectPickerModal, {
      open: true,
      current: 'PSD_GAN',
      suggestions: [],
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="project-picker-input"]');
    expect(input?.value).toBe('PSD_GAN');
  });

  it('renders the suggestions as <option> values in a <datalist>', () => {
    const { container } = render(ProjectPickerModal, {
      open: true,
      current: null,
      suggestions: ['Alpha', 'Beta'],
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    const options = container.querySelectorAll('datalist option');
    expect(Array.from(options).map((o) => o.getAttribute('value'))).toEqual(['Alpha', 'Beta']);
  });

  it('confirm with a trimmed non-empty value calls onConfirm with the trimmed string', async () => {
    const onConfirm = vi.fn();
    const { container } = render(ProjectPickerModal, {
      open: true,
      current: null,
      suggestions: [],
      onConfirm,
      onCancel: vi.fn(),
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="project-picker-input"]');
    await fireEvent.input(input!, { target: { value: '  Foo  ' } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="project-picker-confirm"]')!,
    );
    expect(onConfirm).toHaveBeenCalledWith('Foo');
  });

  it('confirm with empty string calls onConfirm with null (clear)', async () => {
    const onConfirm = vi.fn();
    const { container } = render(ProjectPickerModal, {
      open: true,
      current: 'PSD_GAN',
      suggestions: [],
      onConfirm,
      onCancel: vi.fn(),
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="project-picker-input"]');
    await fireEvent.input(input!, { target: { value: '' } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="project-picker-confirm"]')!,
    );
    expect(onConfirm).toHaveBeenCalledWith(null);
  });

  it('Enter in the input commits the value', async () => {
    const onConfirm = vi.fn();
    const { container } = render(ProjectPickerModal, {
      open: true,
      current: null,
      suggestions: [],
      onConfirm,
      onCancel: vi.fn(),
    });
    const input = container.querySelector<HTMLInputElement>('[data-testid="project-picker-input"]');
    await fireEvent.input(input!, { target: { value: 'Bar' } });
    await fireEvent.keyDown(input!, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledWith('Bar');
  });

  it('Cancel button calls onCancel without calling onConfirm', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(ProjectPickerModal, {
      open: true,
      current: null,
      suggestions: [],
      onConfirm,
      onCancel,
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="project-picker-cancel"]')!,
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
