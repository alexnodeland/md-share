import { describe, expect, it } from 'vitest';
import { countStats, formatStats } from '../src/stats.ts';

describe('countStats', () => {
  it('counts characters and words', () => {
    expect(countStats('hello world')).toEqual({ characters: 11, words: 2 });
  });

  it('treats any run of non-whitespace as a word', () => {
    expect(countStats('one  two\tthree\nfour')).toEqual({ characters: 19, words: 4 });
  });

  it('returns zeros for empty or whitespace-only input', () => {
    expect(countStats('')).toEqual({ characters: 0, words: 0 });
    expect(countStats('   \n\t')).toEqual({ characters: 5, words: 0 });
  });
});

describe('formatStats', () => {
  it('uses plural forms by default', () => {
    expect(formatStats({ characters: 11, words: 2 })).toBe('2 words · 11 characters');
  });

  it('uses singular forms for counts of one', () => {
    expect(formatStats({ characters: 1, words: 1 })).toBe('1 word · 1 character');
  });

  it('thousands-separates large numbers', () => {
    expect(formatStats({ characters: 12345, words: 2000 })).toBe('2,000 words · 12,345 characters');
  });
});
