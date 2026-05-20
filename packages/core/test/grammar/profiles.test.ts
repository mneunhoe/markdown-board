import { describe, expect, it } from 'vitest';

import { getGrammarProfile } from '../../src/grammar/profiles.js';
import { parseTasks, toMarkdown } from '../../src/grammar/tasks.js';

// A vault exercising every Task field, expressed in the default profile.
const DEFAULT_MD = `## Active
- [ ] **[P0] [project:PSD_GAN] [Mon] [pom:3] Blocker task** - a note <!-- id:aaaa1111 -->
  - [x] done subtask
  - [ ] open subtask
- [x] **[P1] High task** <!-- id:bbbb2222 -->
- [ ] **[P3] Low task** <!-- id:cccc3333 -->
- [ ] **Plain task** <!-- id:dddd4444 -->
`;

describe('getGrammarProfile', () => {
  it('falls back to default for unknown ids', () => {
    expect(getGrammarProfile('nope').id).toBe('default');
    expect(getGrammarProfile(undefined).id).toBe('default');
    expect(getGrammarProfile('obsidian-tasks').id).toBe('obsidian-tasks');
  });
});

describe('default profile', () => {
  it('round-trips losslessly (idempotent serialize∘parse)', () => {
    const vault = parseTasks(DEFAULT_MD, { profile: 'default' });
    expect(toMarkdown(vault, { profile: 'default' })).toBe(DEFAULT_MD);
  });
});

describe('obsidian-tasks profile', () => {
  it('reads Obsidian priority emoji into tiers', () => {
    const md = `## Active
- [ ] **🔺 Blocker** <!-- id:1 -->
- [ ] **⏫ High** <!-- id:2 -->
- [ ] **🔽 Low** <!-- id:3 -->
- [ ] **🔼 AlsoHigh** <!-- id:4 -->
- [ ] **⏬ AlsoLow** <!-- id:5 -->
`;
    const tasks = parseTasks(md, { profile: 'obsidian-tasks' }).sections[0]!.tasks;
    expect(tasks.map((t) => t.priority)).toEqual(['blocker', 'high', 'low', 'high', 'low']);
    expect(tasks.map((t) => t.title)).toEqual(['Blocker', 'High', 'Low', 'AlsoHigh', 'AlsoLow']);
  });

  it('writes tiers as canonical emoji', () => {
    const vault = parseTasks(DEFAULT_MD, { profile: 'default' });
    const md = toMarkdown(vault, { profile: 'obsidian-tasks' });
    expect(md).toContain('**🔺 [project:PSD_GAN] [Mon] [pom:3] Blocker task**');
    expect(md).toContain('**⏫ High task**');
    expect(md).toContain('**🔽 Low task**');
    expect(md).toContain('**Plain task**');
    // The bracket priority tokens are gone in this profile.
    expect(md).not.toContain('[P0]');
    expect(md).not.toContain('[P1]');
  });

  it('round-trips losslessly within the profile', () => {
    const vault = parseTasks(DEFAULT_MD, { profile: 'default' });
    const obs = toMarkdown(vault, { profile: 'obsidian-tasks' });
    expect(
      toMarkdown(parseTasks(obs, { profile: 'obsidian-tasks' }), { profile: 'obsidian-tasks' }),
    ).toBe(obs);
  });
});

describe('switching profiles preserves data', () => {
  it('default → obsidian → default loses nothing', () => {
    const original = parseTasks(DEFAULT_MD, { profile: 'default' });
    // Re-save under obsidian, then re-read under obsidian (a profile switch).
    const obsMd = toMarkdown(original, { profile: 'obsidian-tasks' });
    const reread = parseTasks(obsMd, { profile: 'obsidian-tasks' });
    // Canonical default rendering is identical → every field survived.
    expect(toMarkdown(reread, { profile: 'default' })).toBe(DEFAULT_MD);
  });
});
