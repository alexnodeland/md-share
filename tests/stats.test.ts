import { describe, expect, it } from 'vitest';
import { countStats, formatStats } from '../src/stats.ts';

describe('countStats', () => {
  it('counts characters and words', () => {
    expect(countStats('hello world')).toMatchObject({ characters: 11, words: 2 });
  });

  it('treats any run of non-whitespace as a word', () => {
    expect(countStats('one  two\tthree\nfour')).toMatchObject({ characters: 19, words: 4 });
  });

  it('returns zeros for empty or whitespace-only input', () => {
    expect(countStats('')).toEqual({
      characters: 0,
      words: 0,
      readingTimeMinutes: 0,
    });
    expect(countStats('   \n\t')).toEqual({
      characters: 5,
      words: 0,
      readingTimeMinutes: 0,
    });
  });

  it('rounds reading time up and clamps short documents to 1 minute', () => {
    expect(countStats('just a few words here').readingTimeMinutes).toBe(1);
    const long = Array.from({ length: 205 }, (_, i) => `word${i}`).join(' ');
    expect(countStats(long).readingTimeMinutes).toBe(2);
  });
});

describe('formatStats', () => {
  it('uses plural forms by default', () => {
    expect(formatStats({ characters: 11, words: 2, readingTimeMinutes: 2 })).toBe(
      '2 words · 11 characters · 2 min read',
    );
  });

  it('uses singular forms for counts of one', () => {
    expect(formatStats({ characters: 1, words: 1, readingTimeMinutes: 1 })).toBe(
      '1 word · 1 character · 1 min read',
    );
  });

  it('thousands-separates large numbers', () => {
    expect(formatStats({ characters: 12345, words: 2000, readingTimeMinutes: 10 })).toBe(
      '2,000 words · 12,345 characters · 10 min read',
    );
  });

  it('renders zero counts as plurals', () => {
    expect(formatStats({ characters: 0, words: 0, readingTimeMinutes: 0 })).toBe(
      '0 words · 0 characters · 0 min read',
    );
  });
});
