import type { PluginContext, Task, Vault } from '@markdown-board/plugin-api';
import { fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { runExport, setApi } from '../src/context.js';
import ExportButtonHost from './fixtures/ExportButtonHost.svelte';

function task(over: Partial<Task> = {}): Task {
  return {
    id: 'x',
    checked: false,
    title: 'T',
    note: '',
    resolution: '',
    priority: null,
    project: null,
    day: null,
    pomodoros: 0,
    subtasks: [],
    ...over,
  };
}

function fakeApi() {
  const saveFile = vi.fn((_name: string, _contents: string, _mime?: string) => Promise.resolve());
  const notify = vi.fn();
  setApi({ ui: { saveFile, notify } } as unknown as PluginContext);
  return { saveFile, notify };
}

afterEach(() => setApi(null));

describe('ExportButton', () => {
  it('saves an .ics when there are scheduled tasks (and the command reuses it)', async () => {
    const { saveFile } = fakeApi();
    const vault: Vault = {
      prelude: '',
      sections: [{ id: 's', name: 'Active', tasks: [task({ title: 'Do', day: 'Mon' })] }],
    };
    const { container } = render(ExportButtonHost, { vault });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="ical-export"]')!,
    );
    expect(saveFile).toHaveBeenCalledOnce();
    const [name, contents, mime] = saveFile.mock.calls[0]!;
    expect(name).toMatch(/^tasks-week-of-\d{8}\.ics$/);
    expect(contents).toContain('BEGIN:VCALENDAR');
    expect(mime).toBe('text/calendar');

    // The palette command runs the same registered exporter.
    saveFile.mockClear();
    runExport();
    expect(saveFile).toHaveBeenCalledOnce();
  });

  it('notifies instead of saving when nothing is scheduled', async () => {
    const { saveFile, notify } = fakeApi();
    const vault: Vault = {
      prelude: '',
      sections: [{ id: 's', name: 'Active', tasks: [task()] }],
    };
    const { container } = render(ExportButtonHost, { vault });
    await fireEvent.click(
      container.querySelector<HTMLButtonElement>('[data-testid="ical-export"]')!,
    );
    expect(saveFile).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledOnce();
  });
});
