import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import LibraryEditorModal from '../../src/components/LibraryEditorModal.svelte';

describe('LibraryEditorModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(LibraryEditorModal, {
      open: false,
      path: 'library/foo.md',
      initialContent: '# Foo',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    expect(container.querySelector('[data-testid="library-editor-textarea"]')).toBeNull();
  });

  it('renders the existing path in the title when editing', () => {
    const { container } = render(LibraryEditorModal, {
      open: true,
      path: 'library/projects/foo.md',
      initialContent: '# Foo',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    expect(container.querySelector('.modal-header h3')?.textContent).toBe(
      'Edit library/projects/foo.md',
    );
  });

  it('pre-fills the textarea with initialContent on open', () => {
    const { container } = render(LibraryEditorModal, {
      open: true,
      path: 'library/foo.md',
      initialContent: '# Foo\n\nbody',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    });
    const textarea = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="library-editor-textarea"]',
    );
    expect(textarea?.value).toBe('# Foo\n\nbody');
  });

  it('Save (existing path) calls onConfirm with { path, content }', async () => {
    const onConfirm = vi.fn();
    const { container } = render(LibraryEditorModal, {
      open: true,
      path: 'library/foo.md',
      initialContent: 'old',
      onConfirm,
      onCancel: vi.fn(),
    });
    const textarea = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="library-editor-textarea"]',
    );
    await fireEvent.input(textarea!, { target: { value: 'new body' } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="library-editor-save"]')!,
    );
    expect(onConfirm).toHaveBeenCalledWith({ path: 'library/foo.md', content: 'new body' });
  });

  it('Cmd/Ctrl + Enter in the textarea commits', async () => {
    const onConfirm = vi.fn();
    const { container } = render(LibraryEditorModal, {
      open: true,
      path: 'library/foo.md',
      initialContent: 'x',
      onConfirm,
      onCancel: vi.fn(),
    });
    const textarea = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="library-editor-textarea"]',
    );
    await fireEvent.keyDown(textarea!, { key: 'Enter', ctrlKey: true });
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('New file mode: builds path from directory + filename and adds .md when missing', async () => {
    const onConfirm = vi.fn();
    const { container } = render(LibraryEditorModal, {
      open: true,
      path: null,
      initialContent: '',
      onConfirm,
      onCancel: vi.fn(),
    });
    const dir = container.querySelector<HTMLInputElement>('[data-testid="library-new-dir"]');
    const name = container.querySelector<HTMLInputElement>('[data-testid="library-new-name"]');
    const textarea = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="library-editor-textarea"]',
    );

    await fireEvent.input(dir!, { target: { value: 'library/projects' } });
    await fireEvent.input(name!, { target: { value: 'fresh' } });
    await fireEvent.input(textarea!, { target: { value: '# Fresh' } });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="library-editor-save"]')!,
    );

    expect(onConfirm).toHaveBeenCalledWith({
      path: 'library/projects/fresh.md',
      content: '# Fresh',
    });
  });

  it('New file mode: rejects an empty filename (no onConfirm call)', async () => {
    const onConfirm = vi.fn();
    const { container } = render(LibraryEditorModal, {
      open: true,
      path: null,
      initialContent: '',
      onConfirm,
      onCancel: vi.fn(),
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="library-editor-save"]')!,
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Cancel button calls onCancel and does not call onConfirm', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(LibraryEditorModal, {
      open: true,
      path: 'library/foo.md',
      initialContent: '',
      onConfirm,
      onCancel,
    });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="library-editor-cancel"]')!,
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
