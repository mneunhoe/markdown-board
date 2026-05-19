import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DayPickerModal from '../../src/components/DayPickerModal.svelte';

describe('DayPickerModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(DayPickerModal, {
      open: false,
      current: null,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    expect(container.querySelector('[data-testid="day-picker-grid"]')).toBeNull();
  });

  it('renders all seven day buttons when open', () => {
    const { container } = render(DayPickerModal, {
      open: true,
      current: null,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    const btns = container.querySelectorAll('[data-testid^="day-picker-"]');
    // 7 days + the cancel + clear footer buttons.
    expect(btns.length).toBeGreaterThanOrEqual(7);
    expect(container.querySelector('[data-testid="day-picker-Mon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="day-picker-Sun"]')).toBeTruthy();
  });

  it('highlights the current day with the active class', () => {
    const { container } = render(DayPickerModal, {
      open: true,
      current: 'Wed',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    const wed = container.querySelector<HTMLButtonElement>('[data-testid="day-picker-Wed"]');
    expect(wed?.classList.contains('active')).toBe(true);
  });

  it('clicking a day calls onConfirm with that day', async () => {
    const onConfirm = vi.fn();
    const { container } = render(DayPickerModal, {
      open: true,
      current: null,
      onConfirm,
      onCancel: vi.fn(),
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="day-picker-Fri"]')!,
    );
    expect(onConfirm).toHaveBeenCalledWith('Fri');
  });

  it('Clear button calls onConfirm with null', async () => {
    const onConfirm = vi.fn();
    const { container } = render(DayPickerModal, {
      open: true,
      current: 'Mon',
      onConfirm,
      onCancel: vi.fn(),
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="day-picker-clear"]')!,
    );
    expect(onConfirm).toHaveBeenCalledWith(null);
  });

  it('Cancel button calls onCancel without calling onConfirm', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(DayPickerModal, {
      open: true,
      current: null,
      onConfirm,
      onCancel,
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="day-picker-cancel"]')!,
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
