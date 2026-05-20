import type { LibraryDoc, Vault } from '@markdown-board/core';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import VaultWorkspace from '../../src/components/VaultWorkspace.svelte';

function makeVault(): Vault {
  return {
    prelude: '',
    sections: [
      {
        id: 'active',
        name: 'Active',
        tasks: [
          {
            id: 't1',
            checked: false,
            title: 'Write tests',
            note: '',
            priority: null,
            project: null,
            day: null,
            pomodoros: 0,
            resolution: '',
            subtasks: [],
          },
        ],
      },
    ],
  };
}

function makeDocs(): LibraryDoc[] {
  return [
    {
      title: 'Alpha',
      fields: { Owner: 'Marcel' },
      sections: {},
      tables: [],
      rawContent: '# Alpha\n',
      path: 'library/alpha.md',
    },
  ];
}

describe('VaultWorkspace', () => {
  it('renders the board view by default', () => {
    const { container } = render(VaultWorkspace, {
      vault: makeVault(),
      libraryDocs: makeDocs(),
    });
    expect(container.querySelector('[data-active="board"]')).toBeTruthy();
    expect(container.querySelector('.board')).toBeTruthy();
  });

  it('switches to the list view when the List tab is clicked', async () => {
    const { container } = render(VaultWorkspace, {
      vault: makeVault(),
      libraryDocs: makeDocs(),
    });
    const listTab = container.querySelector<HTMLButtonElement>('[data-tab="list"]');
    expect(listTab).toBeTruthy();
    await fireEvent.click(listTab!);
    expect(container.querySelector('[data-active="list"]')).toBeTruthy();
  });

  it('switches to the library view when the Library tab is clicked', async () => {
    const { container } = render(VaultWorkspace, {
      vault: makeVault(),
      libraryDocs: makeDocs(),
    });
    const libraryTab = container.querySelector<HTMLButtonElement>('[data-tab="library"]');
    await fireEvent.click(libraryTab!);
    expect(container.querySelector('[data-active="library"]')).toBeTruthy();
    expect(container.textContent).toContain('Alpha');
  });

  it('switches to the overview view when the Overview tab is clicked', async () => {
    const { container } = render(VaultWorkspace, {
      vault: makeVault(),
      libraryDocs: makeDocs(),
    });
    const overviewTab = container.querySelector<HTMLButtonElement>('[data-tab="overview"]');
    await fireEvent.click(overviewTab!);
    expect(container.querySelector('[data-active="overview"]')).toBeTruthy();
  });

  it('renders the empty-state for an empty vault on the board tab', () => {
    const { container } = render(VaultWorkspace, {
      vault: { prelude: '', sections: [] },
      libraryDocs: [],
    });
    expect(container.querySelector('.empty-state')).toBeTruthy();
  });
});
