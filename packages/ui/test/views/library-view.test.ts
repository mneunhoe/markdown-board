import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import LibraryView from '../../src/views/LibraryView.svelte';
import type { LibraryDoc } from '@markdown-board/core';

function makeDoc(overrides: Partial<LibraryDoc> = {}): LibraryDoc {
  return {
    title: 'Untitled',
    fields: {},
    sections: {},
    tables: [],
    rawContent: '',
    path: '',
    ...overrides,
  };
}

describe('LibraryView', () => {
  it('renders one article per doc', () => {
    const { container } = render(LibraryView, {
      docs: [makeDoc({ title: 'A' }), makeDoc({ title: 'B' })],
    });
    expect(container.querySelectorAll('.library-doc')).toHaveLength(2);
  });

  it('renders the doc title in the header', () => {
    const { container } = render(LibraryView, {
      docs: [makeDoc({ title: 'PSD_GAN' })],
    });
    expect(container.querySelector('.library-doc-title')?.textContent?.trim()).toBe('PSD_GAN');
  });

  it("falls back to 'Untitled' when the title is empty", () => {
    const { container } = render(LibraryView, { docs: [makeDoc({ title: '' })] });
    expect(container.querySelector('.library-doc-title')?.textContent?.trim()).toBe('Untitled');
  });

  it('renders fields as a definition list when present', () => {
    const { container } = render(LibraryView, {
      docs: [makeDoc({ fields: { Owner: 'Marcel', Status: 'Active' } })],
    });
    const dts = [...container.querySelectorAll('.library-fields dt')].map((n) =>
      n.textContent?.trim(),
    );
    const dds = [...container.querySelectorAll('.library-fields dd')].map((n) =>
      n.textContent?.trim(),
    );
    expect(dts).toEqual(['Owner', 'Status']);
    expect(dds).toEqual(['Marcel', 'Active']);
  });

  it('omits the field list when there are no fields', () => {
    const { container } = render(LibraryView, { docs: [makeDoc()] });
    expect(container.querySelector('.library-fields')).toBeNull();
  });

  it('renders non-_intro sections with their title and content', () => {
    const { container } = render(LibraryView, {
      docs: [
        makeDoc({
          sections: { _intro: 'ignored', Background: 'line one\nline two' },
        }),
      ],
    });
    const titles = [...container.querySelectorAll('.library-section-title')].map((n) =>
      n.textContent?.trim(),
    );
    expect(titles).toEqual(['Background']);
    expect(container.querySelector('.library-section-content')?.textContent).toContain(
      'line one\nline two',
    );
  });

  it('skips _intro and empty sections', () => {
    const { container } = render(LibraryView, {
      docs: [
        makeDoc({
          sections: { _intro: 'has content', Empty: '', Notes: 'kept' },
        }),
      ],
    });
    const titles = [...container.querySelectorAll('.library-section-title')].map((n) =>
      n.textContent?.trim(),
    );
    expect(titles).toEqual(['Notes']);
  });

  it('renders parsed tables with headers and rows', () => {
    const { container } = render(LibraryView, {
      docs: [
        makeDoc({
          tables: [
            {
              headers: ['Name', 'Role'],
              rows: [
                ['Marcel', 'Owner'],
                ['Alex', 'Reviewer'],
              ],
            },
          ],
        }),
      ],
    });
    const ths = [...container.querySelectorAll('.library-table th')].map((n) =>
      n.textContent?.trim(),
    );
    expect(ths).toEqual(['Name', 'Role']);
    const cells = [...container.querySelectorAll('.library-table tbody td')].map((n) =>
      n.textContent?.trim(),
    );
    expect(cells).toEqual(['Marcel', 'Owner', 'Alex', 'Reviewer']);
  });

  it('renders a resolved [[wiki-link]] as a clickable button', () => {
    const { container } = render(LibraryView, {
      docs: [
        makeDoc({ title: 'Alpha', sections: { Notes: 'see [[Beta]] now' } }),
        makeDoc({ title: 'Beta' }),
      ],
    });
    const link = container.querySelector<HTMLButtonElement>('[data-testid="wikilink"]');
    expect(link?.getAttribute('data-target')).toBe('Beta');
    expect(link?.textContent?.trim()).toBe('Beta');
  });

  it('uses the alias label for [[Target|alias]] links', () => {
    const { container } = render(LibraryView, {
      docs: [
        makeDoc({ title: 'Alpha', sections: { Notes: '[[Beta|the beta]]' } }),
        makeDoc({ title: 'Beta' }),
      ],
    });
    const link = container.querySelector<HTMLButtonElement>('[data-testid="wikilink"]');
    expect(link?.getAttribute('data-target')).toBe('Beta');
    expect(link?.textContent?.trim()).toBe('the beta');
  });

  it('renders an unresolved link as dimmed, non-clickable text', () => {
    const { container } = render(LibraryView, {
      docs: [makeDoc({ title: 'Alpha', sections: { Notes: 'see [[Ghost]]' } })],
    });
    expect(container.querySelector('[data-testid="wikilink"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="wikilink-unresolved"]')?.textContent?.trim(),
    ).toBe('Ghost');
  });

  it('shows a backlinks panel listing docs that link here', () => {
    const { container } = render(LibraryView, {
      docs: [
        makeDoc({ title: 'Alpha', path: 'library/alpha.md', rawContent: 'see [[Beta]]' }),
        makeDoc({ title: 'Beta', path: 'library/beta.md', rawContent: 'standalone' }),
      ],
    });
    const panel = container.querySelector('[data-testid="backlinks"]');
    expect(panel).toBeTruthy();
    const links = [...container.querySelectorAll('[data-testid="backlink"]')].map((n) =>
      n.textContent?.trim(),
    );
    expect(links).toEqual(['Alpha']);
  });

  it('renders EmptyState when there are no docs', () => {
    const { container } = render(LibraryView, { docs: [] });
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.querySelector('.library-doc')).toBeNull();
  });

  describe('onEdit (slice 6d)', () => {
    it('without onEdit, no edit / new buttons are rendered', () => {
      const { container } = render(LibraryView, {
        docs: [makeDoc({ title: 'A', path: 'library/a.md' })],
      });
      expect(container.querySelector('.library-edit-btn')).toBeNull();
      expect(container.querySelector('.library-new-btn')).toBeNull();
    });

    it('with onEdit, each doc gets an Edit button keyed by its path', () => {
      const { container } = render(LibraryView, {
        docs: [makeDoc({ title: 'A', path: 'library/a.md' })],
        onEdit: vi.fn(),
      });
      expect(container.querySelector('[data-testid="library-edit-library/a.md"]')).toBeTruthy();
    });

    it('clicking Edit calls onEdit with the doc path', async () => {
      const onEdit = vi.fn();
      const { container } = render(LibraryView, {
        docs: [makeDoc({ title: 'A', path: 'library/a.md' })],
        onEdit,
      });
      await fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-testid="library-edit-library/a.md"]')!,
      );
      expect(onEdit).toHaveBeenCalledWith('library/a.md');
    });

    it('with onEdit, a "+ New file" button is rendered (and clicking it calls onEdit with null)', async () => {
      const onEdit = vi.fn();
      const { container } = render(LibraryView, {
        docs: [makeDoc({ title: 'A', path: 'library/a.md' })],
        onEdit,
      });
      const newBtn = container.querySelector<HTMLButtonElement>('[data-testid="library-new"]');
      expect(newBtn).toBeTruthy();
      await fireEvent.click(newBtn!);
      expect(onEdit).toHaveBeenCalledWith(null);
    });

    it('with onEdit and no docs, the empty state still shows a "+ New file" affordance', () => {
      const { container } = render(LibraryView, { docs: [], onEdit: vi.fn() });
      expect(container.querySelector('[data-testid="library-new"]')).toBeTruthy();
    });
  });
});
