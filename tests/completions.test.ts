import { describe, expect, it } from 'vitest';
import {
  applyCompletion,
  citationTargets,
  completionContext,
  footnoteLabels,
  suggest,
} from '../src/completions.ts';

const at = (text: string) => completionContext(text.replace('|', ''), text.indexOf('|'));

describe('completionContext', () => {
  it('detects a heading link being typed', () => {
    expect(at('See [setup](#ins|')).toEqual({ kind: 'anchor', from: 13, to: 16, query: 'ins' });
    expect(at('See [setup](#|)')).toEqual({ kind: 'anchor', from: 13, to: 13, query: '' });
  });

  it('detects a footnote reference being typed', () => {
    expect(at('Claim[^so|')).toEqual({ kind: 'footnote', from: 7, to: 9, query: 'so' });
  });

  it('ignores footnote definitions at the start of a line', () => {
    expect(at('text\n[^so|')).toBeNull();
  });

  it('detects a citation or cross-reference being typed', () => {
    expect(at('[@kn|')).toEqual({ kind: 'citation', from: 2, to: 4, query: 'kn' });
    expect(at('As @|')).toEqual({ kind: 'citation', from: 4, to: 4, query: '' });
    expect(at('[@a; @fig:p|')).toEqual({ kind: 'citation', from: 6, to: 11, query: 'fig:p' });
    expect(at('@|')).toEqual({ kind: 'citation', from: 1, to: 1, query: '' });
  });

  it('ignores an @ inside a word, like an email', () => {
    expect(at('me@exa|')).toBeNull();
  });

  it('only looks at the current line and needs the trigger', () => {
    expect(at('[a](#x\nplain|')).toBeNull();
    expect(at('plain text|')).toBeNull();
    expect(at('[a](https://x.dev|')).toBeNull();
  });
});

describe('footnoteLabels', () => {
  it('lists defined labels once, in order', () => {
    expect(
      footnoteLabels('a[^x]\n\n[^src]: one\n[^1]: two\n[^src]: dup\n  [^no]: indented'),
    ).toEqual(['src', '1']);
  });
});

describe('citationTargets', () => {
  it('lists bibliography keys and labels once each, in order', () => {
    const doc = [
      'See ![P](p.png){#fig:plot} and $$ x $$ {#eq:x}',
      '',
      '| a |',
      '',
      ': T {#tbl:t}',
      '',
      '```bibliography',
      '@book{knuth84, author = {Donald Knuth}, title = {TeX}}',
      '@misc{knuth84, title = {Dup}}',
      '```',
      '',
      '```bibtex',
      '@misc{notcited, title = {Just code}}',
      '```',
    ].join('\n');
    expect(citationTargets(doc)).toEqual([
      { label: 'knuth84', value: 'knuth84', detail: 'Knuth' },
      { label: 'fig:plot', value: 'fig:plot', detail: 'figure' },
      { label: 'eq:x', value: 'eq:x', detail: 'equation' },
      { label: 'tbl:t', value: 'tbl:t', detail: 'table' },
    ]);
  });

  it('is empty for a document without any', () => {
    expect(citationTargets('# Plain')).toEqual([]);
  });
});

describe('suggest', () => {
  const headings = [
    { level: 2, text: 'Installation', slug: 'installation' },
    { level: 2, text: 'Usage', slug: 'usage' },
    { level: 3, text: 'Advanced install', slug: 'advanced-install' },
  ];

  it('ranks prefix matches before substring matches', () => {
    const ctx = { kind: 'anchor' as const, from: 0, to: 3, query: 'ins' };
    expect(suggest(ctx, headings, []).map((c) => c.value)).toEqual([
      'installation',
      'advanced-install',
    ]);
  });

  it('matches heading text as well as slugs, case-insensitively', () => {
    const ctx = { kind: 'anchor' as const, from: 0, to: 2, query: 'US' };
    expect(suggest(ctx, headings, [])).toEqual([
      { label: 'Usage', value: 'usage', detail: '#usage' },
    ]);
  });

  it('offers everything for an empty query and drops exact matches', () => {
    const all = { kind: 'anchor' as const, from: 0, to: 0, query: '' };
    expect(suggest(all, headings, [])).toHaveLength(3);
    const exact = { kind: 'anchor' as const, from: 0, to: 5, query: 'usage' };
    expect(suggest(exact, headings, [])).toEqual([]);
  });

  it('suggests footnote labels', () => {
    const ctx = { kind: 'footnote' as const, from: 0, to: 1, query: 's' };
    expect(suggest(ctx, headings, ['src', 'sidebar', 'x'])).toEqual([
      { label: 'src', value: 'src', detail: '[^src]' },
      { label: 'sidebar', value: 'sidebar', detail: '[^sidebar]' },
    ]);
  });

  it('suggests citation targets only for citations', () => {
    const cites = [
      { label: 'knuth84', value: 'knuth84', detail: 'Knuth' },
      { label: 'fig:plot', value: 'fig:plot', detail: 'figure' },
    ];
    const ctx = { kind: 'citation' as const, from: 0, to: 2, query: 'kn' };
    expect(suggest(ctx, headings, ['kn'], cites)).toEqual([cites[0]]);
    expect(suggest(ctx, headings, ['kn'])).toEqual([]);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => `n${i}`);
    expect(suggest({ kind: 'footnote', from: 0, to: 0, query: '' }, [], many)).toHaveLength(8);
  });
});

describe('applyCompletion', () => {
  it('inserts the slug and closes the link', () => {
    const value = 'See [x](#ins';
    const ctx = completionContext(value, value.length)!;
    expect(applyCompletion(value, ctx, { label: 'I', value: 'installation', detail: '' })).toEqual({
      value: 'See [x](#installation)',
      start: 22,
      end: 22,
    });
  });

  it('inserts a citation key with no closer', () => {
    const value = 'As [@kn] said';
    const ctx = completionContext(value, 7)!;
    expect(applyCompletion(value, ctx, { label: 'k', value: 'knuth84', detail: '' })).toEqual({
      value: 'As [@knuth84] said',
      start: 12,
      end: 12,
    });
  });

  it('reuses an existing closer and moves past it', () => {
    const value = 'Claim[^s] more';
    const ctx = completionContext(value, 8)!;
    expect(applyCompletion(value, ctx, { label: 'src', value: 'src', detail: '' })).toEqual({
      value: 'Claim[^src] more',
      start: 11,
      end: 11,
    });
  });
});
