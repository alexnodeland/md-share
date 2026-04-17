import { describe, expect, it } from 'vitest';
import { deriveFilename, firstHeadingText, slugifyFilename } from '../src/filename.ts';

describe('firstHeadingText', () => {
  it('returns the first H1', () => {
    expect(firstHeadingText('# Hello World\n\nbody')).toBe('Hello World');
  });

  it('accepts any H1-H6 level', () => {
    expect(firstHeadingText('## Sub heading')).toBe('Sub heading');
    expect(firstHeadingText('###### Deep')).toBe('Deep');
  });

  it('strips markdown formatting characters', () => {
    expect(firstHeadingText('# *Bold* `code` [link]')).toBe('Bold code link');
  });

  it('ignores hashes inside fenced code blocks', () => {
    const src = ['```', '# not a heading', '```', '', '# real heading'].join('\n');
    expect(firstHeadingText(src)).toBe('real heading');
  });

  it('returns null when no heading exists', () => {
    expect(firstHeadingText('just a paragraph')).toBeNull();
    expect(firstHeadingText('')).toBeNull();
  });

  it('skips headings that are empty after stripping', () => {
    expect(firstHeadingText('# ``\n# Real')).toBe('Real');
  });
});

describe('slugifyFilename', () => {
  it('kebab-cases ASCII text', () => {
    expect(slugifyFilename('Hello World')).toBe('hello-world');
  });

  it('strips punctuation and special characters', () => {
    expect(slugifyFilename('Hello, World! (v2)')).toBe('hello-world-v2');
  });

  it('trims leading/trailing dashes', () => {
    expect(slugifyFilename('--Hello--')).toBe('hello');
  });

  it('truncates long text and re-trims dashes', () => {
    const long = `${'a'.repeat(30)} ${'b'.repeat(40)}`;
    const slug = slugifyFilename(long);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.startsWith('-')).toBe(false);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('returns empty when input has no slug-safe characters', () => {
    expect(slugifyFilename('!!!')).toBe('');
  });
});

describe('deriveFilename', () => {
  it('uses the first heading as the stem', () => {
    expect(deriveFilename('# My Document', 'md')).toBe('my-document.md');
  });

  it('falls back to "document" when no heading is present', () => {
    expect(deriveFilename('just prose', 'html')).toBe('document.html');
  });

  it('falls back to "document" when the heading slugs to empty', () => {
    expect(deriveFilename('# !!!', 'png')).toBe('document.png');
  });

  it('supports arbitrary extensions', () => {
    expect(deriveFilename('# Report', 'pdf')).toBe('report.pdf');
  });
});
