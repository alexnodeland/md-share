import { describe, expect, it } from 'vitest';
import { formatCaption } from '../../src/listen/caption.ts';

describe('formatCaption', () => {
  it('returns an empty string for empty or whitespace-only input', () => {
    expect(formatCaption('')).toBe('');
    expect(formatCaption('   \n  \t ')).toBe('');
  });

  it('passes short text through unchanged', () => {
    expect(formatCaption('Hello world')).toBe('Hello world');
  });

  it('collapses inner whitespace runs to a single space', () => {
    expect(formatCaption('a \n\t  b')).toBe('a b');
  });

  it('trims leading and trailing whitespace', () => {
    expect(formatCaption('   padded   ')).toBe('padded');
  });

  it('returns the whole string when it is exactly at the cap', () => {
    const text = 'a'.repeat(180);
    expect(formatCaption(text)).toBe(text);
  });

  it('truncates with an ellipsis when longer than the default 180-char cap', () => {
    const text = 'a'.repeat(200);
    const out = formatCaption(text);
    expect(out.length).toBe(180);
    expect(out.endsWith('…')).toBe(true);
  });

  it('honours a custom maxLen parameter', () => {
    expect(formatCaption('abcdefgh', 5)).toBe('abcd…');
  });

  it('trims any trailing whitespace before appending the ellipsis', () => {
    // "abc def" truncated to 5 chars would be "abc d" — we want "abc…"
    expect(formatCaption('abc def ghi', 5)).toBe('abc…');
  });

  it('clamps maxLen to at least 1', () => {
    expect(formatCaption('anything', 0)).toBe('…');
    expect(formatCaption('x', 0)).toBe('x');
  });

  it('returns just the ellipsis when maxLen=1 and input overflows', () => {
    expect(formatCaption('abcdef', 1)).toBe('…');
  });

  it('floors non-integer maxLen values', () => {
    expect(formatCaption('abcdefgh', 5.7)).toBe('abcd…');
  });
});
