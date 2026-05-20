import { describe, expect, it } from 'vitest';

import { filterCommands, fuzzyScore, type Command } from '../../src/lib/commands.js';

const cmd = (id: string, title: string, extra: Partial<Command> = {}): Command => ({
  id,
  title,
  run: () => {},
  ...extra,
});

describe('fuzzyScore', () => {
  it('scores 0 for an empty query (matches anything)', () => {
    expect(fuzzyScore('', 'anything')).toBe(0);
  });

  it('returns null when the query is not a subsequence', () => {
    expect(fuzzyScore('xyz', 'open settings')).toBeNull();
  });

  it('matches a subsequence', () => {
    expect(fuzzyScore('ops', 'open settings')).not.toBeNull();
  });

  it('rewards a contiguous prefix over a scattered match', () => {
    const contiguous = fuzzyScore('open', 'open vault')!;
    const scattered = fuzzyScore('open', 'zozpzezn')!;
    expect(contiguous).toBeGreaterThan(scattered);
  });
});

describe('filterCommands', () => {
  const commands = [
    cmd('open', 'Open vault'),
    cmd('settings', 'Open settings', { keywords: ['preferences'] }),
    cmd('theme', 'Toggle light / dark theme'),
  ];

  it('returns all enabled commands in order for an empty query', () => {
    expect(filterCommands(commands, '').map((c) => c.id)).toEqual(['open', 'settings', 'theme']);
  });

  it('omits disabled commands', () => {
    const list = [...commands, cmd('hidden', 'Hidden', { enabled: false })];
    expect(filterCommands(list, '').some((c) => c.id === 'hidden')).toBe(false);
  });

  it('ranks better matches first', () => {
    const result = filterCommands(commands, 'theme');
    expect(result[0]?.id).toBe('theme');
  });

  it('matches against keywords as well as the title', () => {
    const result = filterCommands(commands, 'preferences');
    expect(result.map((c) => c.id)).toContain('settings');
  });

  it('drops commands that do not match the query', () => {
    expect(filterCommands(commands, 'zzz')).toEqual([]);
  });
});
