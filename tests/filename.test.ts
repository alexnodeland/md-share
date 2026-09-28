import { describe, expect, it } from 'vitest';
import {
  deriveFilename,
  documentTitle,
  firstHeadingText,
  pageTitle,
  slugifyFilename,
} from '../src/filename.ts';

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

  it('ignores hashes inside tilde fences', () => {
    const src = ['~~~', '# not a heading', '~~~', '# real'].join('\n');
    expect(firstHeadingText(src)).toBe('real');
  });

  it('keeps link text and drops link targets', () => {
    expect(firstHeadingText('# See [the docs](https://x.dev/a_b)')).toBe('See the docs');
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

describe('documentTitle', () => {
  it('prefers a frontmatter title', () => {
    expect(documentTitle('---\ntitle: "Field Notes"\n---\n# Heading')).toBe('Field Notes');
  });

  it('does not mistake a YAML comment for a heading', () => {
    expect(documentTitle('---\n# comment\nauthor: me\n---\n## Real')).toBe('Real');
  });

  it('falls back to the first heading when the title is blank', () => {
    expect(documentTitle('---\ntitle: "  "\n---\n# Heading')).toBe('Heading');
  });

  it('returns null for an untitled document', () => {
    expect(documentTitle('plain text')).toBeNull();
  });
});

describe('unicode filenames', () => {
  it('keeps non-ASCII letters and digits', () => {
    expect(slugifyFilename('Über Café 2')).toBe('über-café-2');
    expect(deriveFilename('# 日本語のメモ', 'md')).toBe('日本語のメモ.md');
  });

  it('uses the frontmatter title for the filename', () => {
    expect(deriveFilename('---\ntitle: Trip Plan\n---\n# Day 1', 'md')).toBe('trip-plan.md');
  });
});

describe('pageTitle', () => {
  it('leads with the document title', () => {
    expect(pageTitle('# Trip plan')).toBe('Trip plan · md-share');
  });

  it('is just the app name for untitled documents', () => {
    expect(pageTitle('')).toBe('md-share');
  });
});
