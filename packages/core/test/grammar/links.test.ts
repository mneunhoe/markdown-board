import { describe, expect, it } from 'vitest';

import {
  buildBacklinks,
  buildLinkLookup,
  docKey,
  extractWikiLinks,
  resolveWikiLink,
  splitByWikiLinks,
} from '../../src/grammar/links.js';
import type { LibraryDoc } from '../../src/grammar/types.js';

function doc(title: string, path: string, rawContent = ''): LibraryDoc {
  return { title, fields: {}, sections: {}, tables: [], rawContent, path };
}

describe('extractWikiLinks', () => {
  it('extracts targets and aliases', () => {
    expect(extractWikiLinks('see [[Alpha]] and [[Beta|the beta]] here')).toEqual([
      { target: 'Alpha', alias: null },
      { target: 'Beta', alias: 'the beta' },
    ]);
  });

  it('ignores empty targets', () => {
    expect(extractWikiLinks('[[]] and [[ ]]')).toEqual([]);
  });
});

describe('splitByWikiLinks', () => {
  it('splits text into ordered text + link segments', () => {
    expect(splitByWikiLinks('a [[B|bee]] c')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'link', target: 'B', label: 'bee' },
      { kind: 'text', text: ' c' },
    ]);
  });

  it('uses the target as the label when there is no alias', () => {
    expect(splitByWikiLinks('[[Gamma]]')).toEqual([
      { kind: 'link', target: 'Gamma', label: 'Gamma' },
    ]);
  });
});

describe('resolveWikiLink', () => {
  const docs = [doc('Alpha Project', 'library/alpha.md'), doc('Beta', 'library/beta-notes.md')];
  const lookup = buildLinkLookup(docs);

  it('resolves by title (case-insensitive)', () => {
    expect(resolveWikiLink('alpha project', lookup)?.path).toBe('library/alpha.md');
  });

  it('resolves by filename basename', () => {
    expect(resolveWikiLink('beta-notes', lookup)?.title).toBe('Beta');
  });

  it('returns null for an unknown target', () => {
    expect(resolveWikiLink('nope', lookup)).toBeNull();
  });
});

describe('buildBacklinks', () => {
  it('indexes which docs link to each doc', () => {
    const docs = [
      doc('Alpha', 'library/alpha.md', 'links to [[Beta]]'),
      doc('Gamma', 'library/gamma.md', 'also links to [[Beta]] twice [[Beta]]'),
      doc('Beta', 'library/beta.md', 'standalone'),
    ];
    const map = buildBacklinks(docs);
    const betaKey = docKey(docs[2]!);
    const sources = map.get(betaKey)!;
    expect(sources.map((s) => s.fromTitle).sort()).toEqual(['Alpha', 'Gamma']);
    // Duplicate links from the same source collapse to one entry.
    expect(sources.filter((s) => s.fromTitle === 'Gamma')).toHaveLength(1);
  });

  it('ignores self-links', () => {
    const docs = [doc('Solo', 'library/solo.md', 'I reference [[Solo]] myself')];
    expect(buildBacklinks(docs).size).toBe(0);
  });
});
