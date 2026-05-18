import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LibraryView from '../../src/views/LibraryView.svelte';
import type { LibraryDoc } from '@markdown-board/core';

function makeDoc(overrides: Partial<LibraryDoc> = {}): LibraryDoc {
  return {
    title: 'Untitled',
    fields: {},
    sections: {},
    tables: [],
    rawContent: '',
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

  it('renders EmptyState when there are no docs', () => {
    const { container } = render(LibraryView, { docs: [] });
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.querySelector('.library-doc')).toBeNull();
  });
});
