import { describe, expect, it } from 'vitest';
import { applyCompletion, completionContext, footnoteLabels, suggest } from '../src/completions.ts';

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
