import { describe, expect, it } from 'vitest';

import { parseDashboard } from '../../../src/lib/vault/dashboard.js';

describe('parseDashboard', () => {
  it('returns the whole content as body when there is no frontmatter', () => {
    const { body, config, errors } = parseDashboard('# Dashboard\n\n## Today\nnotes');
    expect(body).toBe('# Dashboard\n\n## Today\nnotes');
    expect(config).toEqual({});
    expect(errors).toEqual([]);
  });

  it('splits frontmatter config from the markdown body', () => {
    const { body, config, errors } = parseDashboard(
      `---
stats:
  - label: P0 blockers
    where: { priority: blocker }
  - label: Alpha open
    where: { project: Alpha, checked: false }
builtins:
  cards: [open, total]
  breakdowns: [priority]
---

# Dashboard
pinned notes`,
    );
    expect(errors).toEqual([]);
    expect(body).toBe('# Dashboard\npinned notes');
    expect(config.stats).toEqual([
      { label: 'P0 blockers', where: { priority: ['blocker'] } },
      { label: 'Alpha open', where: { project: ['Alpha'], checked: false } },
    ]);
    expect(config.builtins).toEqual({ cards: ['open', 'total'], breakdowns: ['priority'] });
  });

  it('accepts a list value for an enum filter (OR within the key)', () => {
    const { config } = parseDashboard(
      `---
stats:
  - label: Weekdays
    where: { day: [Mon, Tue, Wed] }
---
body`,
    );
    expect(config.stats?.[0]?.where?.day).toEqual(['Mon', 'Tue', 'Wed']);
  });

  it('reports malformed YAML without throwing, keeping the body', () => {
    const { body, config, errors } = parseDashboard(`---
stats: [unterminated
---
body here`);
    expect(body).toBe('body here');
    expect(config).toEqual({});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('drops invalid enum values and reports them', () => {
    const { config, errors } = parseDashboard(
      `---
stats:
  - label: Bad priority
    where: { priority: nope }
builtins:
  cards: [open, bogus]
---
body`,
    );
    // The bad priority is dropped (filter has no priority key), stat still kept.
    expect(config.stats?.[0]).toEqual({ label: 'Bad priority', where: {} });
    // Unknown card filtered out, error reported.
    expect(config.builtins?.cards).toEqual(['open']);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a stat entry without a string label', () => {
    const { config, errors } = parseDashboard(
      `---
stats:
  - where: { priority: high }
---
body`,
    );
    expect(config.stats).toEqual([]);
    expect(errors.some((e) => e.includes('label'))).toBe(true);
  });
});
