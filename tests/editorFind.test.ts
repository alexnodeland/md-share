import { describe, expect, it } from 'vitest';
import {
  findAll,
  findNext,
  findPrev,
  pickReplaceTarget,
  replaceAll,
  replaceOne,
} from '../src/editorFind.ts';

const CS = { caseSensitive: true };
const CI = { caseSensitive: false };

describe('findNext', () => {
  it('returns null for empty needle', () => {
    expect(findNext('hello world', '', 0, CS)).toBeNull();
  });

  it('finds a match at the expected index', () => {
    expect(findNext('hello world hello', 'hello', 0, CS)).toEqual({ start: 0, end: 5 });
  });

  it('respects the from index', () => {
    expect(findNext('hello world hello', 'hello', 1, CS)).toEqual({ start: 12, end: 17 });
  });

  it('wraps around from the end back to the beginning', () => {
    expect(findNext('hello world', 'hello', 10, CS)).toEqual({ start: 0, end: 5 });
  });

  it('returns null when needle is absent', () => {
    expect(findNext('abcdef', 'xyz', 0, CS)).toBeNull();
  });

  it('is case-insensitive when configured', () => {
    expect(findNext('Hello World', 'hello', 0, CI)).toEqual({ start: 0, end: 5 });
  });

  it('is case-sensitive when configured', () => {
    expect(findNext('Hello World', 'hello', 0, CS)).toBeNull();
  });

  it('clamps negative from to zero', () => {
    expect(findNext('hello', 'hello', -5, CS)).toEqual({ start: 0, end: 5 });
  });
});

describe('findPrev', () => {
  it('returns null for empty needle', () => {
    expect(findPrev('hello world', '', 5, CS)).toBeNull();
  });

  it('finds the previous match before from', () => {
    expect(findPrev('hello world hello', 'hello', 17, CS)).toEqual({ start: 12, end: 17 });
  });

  it('does not return the match that starts at from', () => {
    expect(findPrev('hello world hello', 'hello', 12, CS)).toEqual({ start: 0, end: 5 });
  });

  it('wraps from beginning to end', () => {
    expect(findPrev('hello world hello', 'hello', 0, CS)).toEqual({ start: 12, end: 17 });
  });

  it('returns null when needle is absent', () => {
    expect(findPrev('abcdef', 'xyz', 6, CS)).toBeNull();
  });

  it('is case-insensitive when configured', () => {
    expect(findPrev('HELLO hello', 'Hello', 11, CI)).toEqual({ start: 6, end: 11 });
  });

  it('handles from=0 without underflow', () => {
    expect(findPrev('ab', 'a', 0, CS)).toEqual({ start: 0, end: 1 });
  });
});

describe('findAll', () => {
  it('returns empty array for empty needle', () => {
    expect(findAll('hello', '', CS)).toEqual([]);
  });

  it('returns empty array when needle is absent', () => {
    expect(findAll('hello', 'xyz', CS)).toEqual([]);
  });

  it('returns a single match', () => {
    expect(findAll('hello', 'hello', CS)).toEqual([{ start: 0, end: 5 }]);
  });

  it('returns non-overlapping matches', () => {
    expect(findAll('aaaa', 'aa', CS)).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });

  it('handles multi-line haystacks', () => {
    expect(findAll('foo\nfoo\nbar', 'foo', CS)).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
    ]);
  });

  it('respects case sensitivity', () => {
    expect(findAll('Foo foo FOO', 'foo', CS)).toEqual([{ start: 4, end: 7 }]);
    expect(findAll('Foo foo FOO', 'foo', CI)).toHaveLength(3);
  });
});

describe('replaceOne', () => {
  it('replaces the match and places the cursor after the replacement', () => {
    const result = replaceOne('hello world', { start: 0, end: 5 }, 'howdy');
    expect(result).toEqual({ value: 'howdy world', cursor: 5 });
  });

  it('replaces with a longer string', () => {
    const result = replaceOne('abc', { start: 1, end: 2 }, 'XYZ');
    expect(result).toEqual({ value: 'aXYZc', cursor: 4 });
  });

  it('replaces with an empty string (deletion)', () => {
    const result = replaceOne('remove me now', { start: 7, end: 10 }, '');
    expect(result).toEqual({ value: 'remove now', cursor: 7 });
  });
});

describe('replaceAll', () => {
  it('returns the input unchanged when there are no matches', () => {
    expect(replaceAll('hello', 'xyz', 'abc', CS)).toEqual({ value: 'hello', count: 0 });
  });

  it('returns the input unchanged when the needle is empty', () => {
    expect(replaceAll('hello', '', 'X', CS)).toEqual({ value: 'hello', count: 0 });
  });

  it('replaces every non-overlapping match and reports the count', () => {
    expect(replaceAll('aaaa', 'aa', 'B', CS)).toEqual({ value: 'BB', count: 2 });
  });

  it('preserves case when case-insensitive', () => {
    expect(replaceAll('Foo foo FOO', 'foo', 'bar', CI)).toEqual({
      value: 'bar bar bar',
      count: 3,
    });
  });

  it('handles replacement shorter than needle (positions stable via reverse walk)', () => {
    expect(replaceAll('abc abc abc', 'abc', 'x', CS)).toEqual({ value: 'x x x', count: 3 });
  });
});

describe('case-insensitive offsets', () => {
  const ci = { caseSensitive: false };

  it('keeps offsets exact when lower-casing changes string length', () => {
    expect(findNext('İstanbul foo bar', 'foo', 0, ci)).toEqual({ start: 9, end: 12 });
    expect(replaceAll('İİ foo FOO', 'foo', 'X', ci)).toEqual({ value: 'İİ X X', count: 2 });
  });

  it('treats regex metacharacters in the needle literally', () => {
    expect(findAll('a.b a+b (x)', '.', ci)).toEqual([{ start: 1, end: 2 }]);
    expect(findAll('a.b a+b (x)', '(x)', ci)).toEqual([{ start: 8, end: 11 }]);
  });
});

describe('pickReplaceTarget', () => {
  const matches = [
    { start: 0, end: 2 },
    { start: 2, end: 4 },
    { start: 8, end: 10 },
  ];

  it('prefers the exactly selected match over an adjacent one', () => {
    expect(pickReplaceTarget(matches, 2, 4)).toEqual({ start: 2, end: 4 });
  });

  it('falls back to the match containing the caret', () => {
    expect(pickReplaceTarget(matches, 3, 3)).toEqual({ start: 2, end: 4 });
  });

  it('then to the next match, then wraps to the first', () => {
    expect(pickReplaceTarget(matches, 5, 5)).toEqual({ start: 8, end: 10 });
    expect(pickReplaceTarget(matches, 11, 11)).toEqual({ start: 0, end: 2 });
  });

  it('returns null without matches', () => {
    expect(pickReplaceTarget([], 0, 0)).toBeNull();
  });
});
