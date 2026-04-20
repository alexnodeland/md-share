import { describe, expect, it } from 'vitest';
import { cleanHeadingText, slugifyHeading, uniqueSlug } from '../src/slug.ts';

describe('cleanHeadingText', () => {
  it('strips Markdown formatting chars and trims', () => {
    expect(cleanHeadingText('  **Bold** and *italic* `code`  ')).toBe('Bold and italic code');
  });

  it('leaves plain text untouched', () => {
    expect(cleanHeadingText('Plain heading')).toBe('Plain heading');
  });

  it('removes square brackets and hashes from inline links and headings', () => {
    expect(cleanHeadingText('# [Title]')).toBe('Title');
  });
});

describe('slugifyHeading', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugifyHeading('Hello World')).toBe('hello-world');
  });

  it('strips common Markdown formatting chars', () => {
    expect(slugifyHeading('*Italic* and **bold**')).toBe('italic-and-bold');
  });

  it('strips inline backticks and brackets', () => {
    expect(slugifyHeading('A `code` [link]')).toBe('a-code-link');
  });

  it('drops non-word punctuation like punctuation, keeping dashes', () => {
    expect(slugifyHeading('Hello, world!')).toBe('hello-world');
  });

  it('collapses adjacent whitespace into a single hyphen', () => {
    expect(slugifyHeading('multi   spaced   heading')).toBe('multi-spaced-heading');
  });

  it('trims surrounding whitespace', () => {
    expect(slugifyHeading('   spaced   ')).toBe('spaced');
  });

  it('preserves internal hyphens', () => {
    expect(slugifyHeading('state-of-the-art')).toBe('state-of-the-art');
  });
});

describe('uniqueSlug', () => {
  it('returns the base for the first occurrence', () => {
    const used = new Map<string, number>();
    expect(uniqueSlug('intro', used)).toBe('intro');
  });

  it('appends -2 on the first collision', () => {
    const used = new Map<string, number>();
    uniqueSlug('intro', used);
    expect(uniqueSlug('intro', used)).toBe('intro-2');
  });

  it('continues incrementing on repeated collisions', () => {
    const used = new Map<string, number>();
    uniqueSlug('intro', used);
    uniqueSlug('intro', used);
    expect(uniqueSlug('intro', used)).toBe('intro-3');
  });

  it('tracks distinct bases independently', () => {
    const used = new Map<string, number>();
    expect(uniqueSlug('a', used)).toBe('a');
    expect(uniqueSlug('b', used)).toBe('b');
    expect(uniqueSlug('a', used)).toBe('a-2');
  });
});
