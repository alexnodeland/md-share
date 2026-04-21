import { describe, expect, it } from 'vitest';
import { type CompleteContext, getSuggestions } from '../src/editorComplete.ts';

const ctx = (overrides: Partial<CompleteContext> = {}): CompleteContext => ({
  headingSlugs: [],
  footnoteLabels: [],
  wikilinkTargets: [],
  emojiShortcodes: {},
  ...overrides,
});

describe('getSuggestions — no trigger', () => {
  it('returns [] on plain text', () => {
    expect(getSuggestions('hello world', 5, ctx())).toEqual([]);
  });

  it('returns [] when cursor is out of bounds (negative)', () => {
    expect(getSuggestions('abc', -1, ctx())).toEqual([]);
  });

  it('returns [] when cursor is past end', () => {
    expect(getSuggestions('abc', 99, ctx())).toEqual([]);
  });

  it('returns [] on an empty doc at cursor 0', () => {
    expect(getSuggestions('', 0, ctx())).toEqual([]);
  });

  it('returns [] when on a heading line # but no preceding (', () => {
    expect(getSuggestions('# head', 6, ctx({ headingSlugs: ['head'] }))).toEqual([]);
  });

  it('returns [] when newline precedes cursor with no trigger', () => {
    expect(getSuggestions('x\n', 2, ctx())).toEqual([]);
  });
});

describe('getSuggestions — heading trigger', () => {
  it('suggests slugs after [text](#', () => {
    const r = getSuggestions('go [to](#in', 11, ctx({ headingSlugs: ['intro', 'info', 'api'] }));
    expect(r.map((s) => s.value)).toEqual(['intro', 'info']);
    expect(r[0]!.kind).toBe('heading');
    expect(r[0]!.insertText).toBe('intro');
    expect(r[0]!.display).toBe('#intro');
    expect(r[0]!.replaceRange).toEqual([9, 11]);
  });

  it('ranks prefix matches first', () => {
    const r = getSuggestions('[x](#in', 7, ctx({ headingSlugs: ['main', 'intro'] }));
    expect(r.map((s) => s.value)).toEqual(['intro', 'main']);
  });

  it('returns all slugs with an empty query', () => {
    const r = getSuggestions('[x](#', 5, ctx({ headingSlugs: ['a', 'b'] }));
    expect(r.map((s) => s.value)).toEqual(['a', 'b']);
  });

  it('ignores # on its own line (heading syntax)', () => {
    expect(getSuggestions('# intro', 7, ctx({ headingSlugs: ['intro'] }))).toEqual([]);
  });

  it('ignores # at start of doc with no preceding (', () => {
    expect(getSuggestions('#foo', 4, ctx({ headingSlugs: ['foo'] }))).toEqual([]);
  });

  it('ignores # preceded by a non-( character', () => {
    expect(getSuggestions('x#foo', 5, ctx({ headingSlugs: ['foo'] }))).toEqual([]);
  });

  it('bails if space comes between # and cursor', () => {
    expect(getSuggestions('(#in tro', 8, ctx({ headingSlugs: ['intro'] }))).toEqual([]);
  });

  it('bails if ) comes between # and cursor', () => {
    expect(getSuggestions('(#) tail', 8, ctx({ headingSlugs: ['x'] }))).toEqual([]);
  });

  it('bails on nested ( between # and cursor', () => {
    expect(getSuggestions('(#(a', 4, ctx({ headingSlugs: ['a'] }))).toEqual([]);
  });

  it('caps to 8 suggestions', () => {
    const many = Array.from({ length: 20 }, (_, i) => `h${i}`);
    const r = getSuggestions('[x](#h', 6, ctx({ headingSlugs: many }));
    expect(r).toHaveLength(8);
  });
});

describe('getSuggestions — footnote trigger', () => {
  it('suggests labels after [^', () => {
    const r = getSuggestions('cite[^eu', 8, ctx({ footnoteLabels: ['euler', 'fermat'] }));
    expect(r[0]!.kind).toBe('footnote');
    expect(r[0]!.value).toBe('euler');
    expect(r[0]!.insertText).toBe('euler]');
    expect(r[0]!.replaceRange).toEqual([6, 8]);
  });

  it('returns [] when no matches', () => {
    expect(getSuggestions('[^zz', 4, ctx({ footnoteLabels: ['a'] }))).toEqual([]);
  });

  it('empty query returns all labels', () => {
    const r = getSuggestions('[^', 2, ctx({ footnoteLabels: ['a', 'b'] }));
    expect(r.map((s) => s.value)).toEqual(['a', 'b']);
  });

  it('bails if ] appears between [^ and cursor', () => {
    expect(getSuggestions('[^1]x', 5, ctx({ footnoteLabels: ['1'] }))).toEqual([]);
  });

  it('bails if a newline appears before [^', () => {
    expect(getSuggestions('\nabc', 4, ctx({ footnoteLabels: ['abc'] }))).toEqual([]);
  });
});

describe('getSuggestions — wikilink trigger', () => {
  it('suggests targets after [[', () => {
    const r = getSuggestions('see [[No', 8, ctx({ wikilinkTargets: ['Note', 'Other'] }));
    expect(r[0]!.kind).toBe('wikilink');
    expect(r[0]!.value).toBe('Note');
    expect(r[0]!.insertText).toBe('Note]]');
    expect(r[0]!.replaceRange).toEqual([6, 8]);
  });

  it('returns [] when wikilinkTargets is empty', () => {
    expect(getSuggestions('[[x', 3, ctx())).toEqual([]);
  });

  it('bails if newline before [[', () => {
    expect(getSuggestions('a\nb', 3, ctx({ wikilinkTargets: ['b'] }))).toEqual([]);
  });

  it('bails if ] appears before cursor within [[', () => {
    expect(getSuggestions('[[a]b', 5, ctx({ wikilinkTargets: ['b'] }))).toEqual([]);
  });

  it('does not trigger on a single [ before cursor', () => {
    expect(getSuggestions('[foo', 4, ctx({ wikilinkTargets: ['foo'] }))).toEqual([]);
  });

  it('handles [[ right at cursor (empty query) → returns all', () => {
    const r = getSuggestions('[[', 2, ctx({ wikilinkTargets: ['a', 'b'] }));
    expect(r.map((s) => s.value)).toEqual(['a', 'b']);
  });
});

describe('getSuggestions — emoji trigger', () => {
  it('suggests emoji after : at start of doc', () => {
    const r = getSuggestions(':sm', 3, ctx({ emojiShortcodes: { smile: '😄' } }));
    expect(r[0]!.kind).toBe('emoji');
    expect(r[0]!.value).toBe('smile');
    expect(r[0]!.insertText).toBe(':smile: ');
    expect(r[0]!.display).toBe('😄 :smile:');
    expect(r[0]!.replaceRange).toEqual([0, 3]);
  });

  it('suggests emoji after : preceded by space', () => {
    const r = getSuggestions('ship :roc', 9, ctx({ emojiShortcodes: { rocket: '🚀' } }));
    expect(r.map((s) => s.value)).toEqual(['rocket']);
    expect(r[0]!.replaceRange).toEqual([5, 9]);
  });

  it('does not trigger on : mid-word (like `foo:bar`)', () => {
    expect(getSuggestions('foo:ba', 6, ctx({ emojiShortcodes: { bar: 'B' } }))).toEqual([]);
  });

  it('empty query after : returns all emoji keys', () => {
    const r = getSuggestions(':', 1, ctx({ emojiShortcodes: { a: 'A', b: 'B' } }));
    expect(r).toHaveLength(2);
  });

  it('returns [] if the char before : is non-boundary', () => {
    expect(getSuggestions('x:ab', 4, ctx({ emojiShortcodes: { ab: 'C' } }))).toEqual([]);
  });

  it('returns [] if no trigger : found scanning back', () => {
    expect(getSuggestions('abcdef', 6, ctx({ emojiShortcodes: { abc: '!' } }))).toEqual([]);
  });

  it('triggers on : after opening bracket', () => {
    const r = getSuggestions('[:sm', 4, ctx({ emojiShortcodes: { smile: '😄' } }));
    expect(r).toHaveLength(1);
  });
});

describe('getSuggestions — priority & interaction', () => {
  it('prefers [[ over [^ when both appear', () => {
    // `[[a[^` — first [[ wins because we scan from [[
    const r = getSuggestions('[[a', 3, ctx({ wikilinkTargets: ['a'], footnoteLabels: ['a'] }));
    expect(r[0]!.kind).toBe('wikilink');
  });

  it('falls through from wikilink to footnote when no [[ found', () => {
    const r = getSuggestions('[^a', 3, ctx({ wikilinkTargets: ['a'], footnoteLabels: ['a'] }));
    expect(r[0]!.kind).toBe('footnote');
  });

  it('falls through to heading trigger', () => {
    const r = getSuggestions('(#a', 3, ctx({ headingSlugs: ['abc'] }));
    expect(r[0]!.kind).toBe('heading');
  });

  it('falls through to emoji trigger last', () => {
    const r = getSuggestions(':abc', 4, ctx({ emojiShortcodes: { abc: 'X' } }));
    expect(r[0]!.kind).toBe('emoji');
  });
});
