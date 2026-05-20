import type { LibraryDoc, Vault } from '@markdown-board/core';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import type { PluginComponent } from '@markdown-board/plugin-api';

import VaultWorkspace from '../../src/components/VaultWorkspace.svelte';
import type { RegisteredView } from '../../src/lib/plugins/registry.svelte.js';
import PluginViewProbe from '../fixtures/PluginViewProbe.svelte';

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

  const pluginViews: RegisteredView[] = [
    {
      key: 'demo:week',
      title: 'Week',
      component: PluginViewProbe as unknown as PluginComponent,
      pluginId: 'demo',
    },
  ];

  it('appends a tab for a plugin-contributed view', () => {
    const { container } = render(VaultWorkspace, {
      vault: makeVault(),
      libraryDocs: makeDocs(),
      pluginViews,
    });
    const tab = container.querySelector<HTMLButtonElement>('[data-tab="demo:week"]');
    expect(tab).toBeTruthy();
    expect(tab!.textContent?.trim()).toBe('Week');
  });

  it('renders the plugin view with a working view context when its tab is active', async () => {
    const { container, getByTestId } = render(VaultWorkspace, {
      vault: makeVault(),
      libraryDocs: makeDocs(),
      pluginViews,
    });
    await fireEvent.click(container.querySelector<HTMLButtonElement>('[data-tab="demo:week"]')!);
    expect(container.querySelector('[data-active="demo:week"]')).toBeTruthy();
    // The probe reads the vault from the view context.
    expect(getByTestId('plugin-view-probe').textContent).toContain('Write tests');
  });
});
