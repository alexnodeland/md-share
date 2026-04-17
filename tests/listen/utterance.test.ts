import { describe, expect, it } from 'vitest';
import { splitUtterance } from '../../src/listen/utterance.ts';

describe('splitUtterance', () => {
  it('returns an empty array for empty or whitespace input', () => {
    expect(splitUtterance('')).toEqual([]);
    expect(splitUtterance('   \n  ')).toEqual([]);
  });

  it('returns a single-element array when text is under the 180-char cap', () => {
    expect(splitUtterance('Short sentence.')).toEqual(['Short sentence.']);
  });

  it('splits on . ! ? boundaries when text exceeds the cap', () => {
    const sentence = 'This is a long sentence. '.repeat(10);
    const out = splitUtterance(sentence);
    expect(out.length).toBeGreaterThan(1);
    for (const s of out) expect(s.length).toBeLessThanOrEqual(180);
  });

  it('keeps punctuation attached when each sentence fits the cap', () => {
    const a = `${'a '.repeat(50)}first.`;
    const b = `${'b '.repeat(50)}second!`;
    const out = splitUtterance(`${a} ${b}`);
    expect(out[0]!.endsWith('first.')).toBe(true);
    expect(out[out.length - 1]!.endsWith('second!')).toBe(true);
  });

  it('word-splits a single oversized sentence at the last space before the cap', () => {
    const long = `${'word '.repeat(100)}`.trim();
    const out = splitUtterance(long);
    expect(out.length).toBeGreaterThan(1);
    for (const piece of out) {
      expect(piece.length).toBeLessThanOrEqual(180);
      expect(piece.trim()).toBe(piece);
    }
  });

  it('hard-splits at the cap when there is no space to break on', () => {
    const wall = 'x'.repeat(400);
    const out = splitUtterance(wall);
    expect(out.length).toBeGreaterThan(1);
    for (const piece of out) expect(piece.length).toBeLessThanOrEqual(180);
    expect(out.join('')).toBe(wall);
  });

  it('treats newlines as sentence boundaries', () => {
    const input = `${'a '.repeat(100)}\n${'b '.repeat(100)}`;
    const out = splitUtterance(input);
    expect(out.length).toBeGreaterThan(1);
  });

  it('skips whitespace-only sentence fragments between newlines', () => {
    const input = `${'a '.repeat(100)}\n   \n${'b '.repeat(100)}`;
    const out = splitUtterance(input);
    expect(out.every((s) => s.trim().length > 0)).toBe(true);
  });

  it('drops empty sentence fragments produced by repeated punctuation', () => {
    const out = splitUtterance('!!!');
    expect(out.every((s) => s.length > 0)).toBe(true);
  });

  it('falls back to hard-splitting when the text is all punctuation', () => {
    const punct = '!'.repeat(400);
    const out = splitUtterance(punct);
    expect(out.length).toBeGreaterThan(1);
    for (const piece of out) expect(piece.length).toBeLessThanOrEqual(180);
    expect(out.join('')).toBe(punct);
  });
});
