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
    expect(countStats('')).toMatchObject({
      characters: 0,
      words: 0,
      readingTimeMinutes: 0,
      fleschKincaid: null,
      headingCount: 0,
      linkCount: 0,
    });
    expect(countStats('   \n\t')).toMatchObject({
      characters: 5,
      words: 0,
      readingTimeMinutes: 0,
      fleschKincaid: null,
    });
  });

  it('rounds reading time up and clamps short documents to 1 minute', () => {
    expect(countStats('just a few words here').readingTimeMinutes).toBe(1);
    const long = Array.from({ length: 205 }, (_, i) => `word${i}`).join(' ');
    expect(countStats(long).readingTimeMinutes).toBe(2);
  });

  it('counts ATX headings (#–######) and ignores non-heading lines', () => {
    const src = [
      '# One',
      '## Two',
      '### Three',
      '#### Four',
      '##### Five',
      '###### Six',
      '####### NotAHeading',
      '#NoSpace',
      'Body line',
    ].join('\n');
    expect(countStats(src).headingCount).toBe(6);
  });

  it('handles CRLF newlines when counting headings', () => {
    expect(countStats('# A\r\n# B\r\nbody').headingCount).toBe(2);
  });

  it('counts markdown [text](url) links only', () => {
    const src = 'See [one](a) and [two](b). Also <https://x> and plain text.';
    expect(countStats(src).linkCount).toBe(2);
  });

  it('returns null fleschKincaid for docs under 100 words', () => {
    expect(countStats('Short doc.').fleschKincaid).toBeNull();
  });

  it('returns a finite fleschKincaid grade for docs over 100 words', () => {
    const sentence =
      'The quick brown fox jumps over the lazy dog while the sleepy cat watches from the window.';
    const src = Array.from({ length: 12 }, () => sentence).join(' ');
    const stats = countStats(src);
    expect(stats.words).toBeGreaterThanOrEqual(100);
    expect(typeof stats.fleschKincaid).toBe('number');
    expect(Number.isFinite(stats.fleschKincaid as number)).toBe(true);
  });

  it('treats text with no sentence terminators as a single sentence', () => {
    // 100 one-syllable words with no punctuation — exercises the `Math.max(1, …)` branch.
    const src = Array.from({ length: 100 }, () => 'cat').join(' ');
    expect(typeof countStats(src).fleschKincaid).toBe('number');
  });

  it('handles words that consist only of punctuation (0 syllables)', () => {
    // Exercise the `lower.length === 0` branch in countSyllables by including pure-symbol tokens.
    const sentence = 'The cat sat on the mat.';
    const prefix = Array.from({ length: 20 }, () => '---').join(' ');
    const src = `${prefix} ${Array.from({ length: 20 }, () => sentence).join(' ')}`;
    const stats = countStats(src);
    expect(stats.words).toBeGreaterThanOrEqual(100);
    expect(stats.fleschKincaid).not.toBeNull();
  });

  it('handles consonant-only tokens (no vowel groups)', () => {
    // Exercise the `?? []` branch in countSyllables: tokens like "shh"/"tsk" have no vowels.
    const sentence = 'The cat sat on the mat and ran.';
    const prefix = Array.from({ length: 20 }, () => 'shh tsk').join(' ');
    const src = `${prefix} ${Array.from({ length: 20 }, () => sentence).join(' ')}`;
    const stats = countStats(src);
    expect(stats.words).toBeGreaterThanOrEqual(100);
    expect(stats.fleschKincaid).not.toBeNull();
  });

  it('applies silent-e syllable rule', () => {
    // Hits SILENT_E_RE branch: a word like "cake" counts as 1 syllable (2 groups → -1).
    const sentence = 'Bake the cake and take the lake mile for tame names.';
    const src = Array.from({ length: 10 }, () => sentence).join(' ');
    const stats = countStats(src);
    expect(stats.words).toBeGreaterThanOrEqual(100);
    expect(stats.fleschKincaid).not.toBeNull();
  });
});

describe('formatStats', () => {
  it('uses plural forms by default', () => {
    expect(
      formatStats({
        characters: 11,
        words: 2,
        readingTimeMinutes: 2,
        fleschKincaid: 8.5,
        headingCount: 3,
        linkCount: 4,
      }),
    ).toBe('2 words · 11 characters · 2 min read · 3 headings · 4 links · grade 8.5');
  });

  it('uses singular forms for counts of one', () => {
    expect(
      formatStats({
        characters: 1,
        words: 1,
        readingTimeMinutes: 1,
        fleschKincaid: null,
        headingCount: 1,
        linkCount: 1,
      }),
    ).toBe('1 word · 1 character · 1 min read · 1 heading · 1 link · grade —');
  });

  it('thousands-separates large numbers', () => {
    expect(
      formatStats({
        characters: 12345,
        words: 2000,
        readingTimeMinutes: 10,
        fleschKincaid: 12.3,
        headingCount: 1200,
        linkCount: 3400,
      }),
    ).toBe(
      '2,000 words · 12,345 characters · 10 min read · 1,200 headings · 3,400 links · grade 12.3',
    );
  });

  it('renders zero counts as plurals', () => {
    expect(
      formatStats({
        characters: 0,
        words: 0,
        readingTimeMinutes: 0,
        fleschKincaid: null,
        headingCount: 0,
        linkCount: 0,
      }),
    ).toBe('0 words · 0 characters · 0 min read · 0 headings · 0 links · grade —');
  });
});
