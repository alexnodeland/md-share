import { describe, expect, it } from 'vitest';
import { generateTOC, parseHeadings, renderTOC } from '../src/toc.ts';

describe('parseHeadings', () => {
  it('extracts h2-h4 headings with levels and slugs', () => {
    const src = ['## First', '### Second sub', '#### Deep', 'body text'].join('\n');
    expect(parseHeadings(src)).toEqual([
      { level: 2, text: 'First', slug: 'first' },
      { level: 3, text: 'Second sub', slug: 'second-sub' },
      { level: 4, text: 'Deep', slug: 'deep' },
    ]);
  });

  it('ignores h1 and h5+', () => {
    const src = ['# Title', '## Real', '##### Too deep'].join('\n');
    expect(parseHeadings(src)).toEqual([{ level: 2, text: 'Real', slug: 'real' }]);
  });

  it('skips headings inside fenced code blocks', () => {
    const src = ['## Before', '```', '## Inside fence', '```', '## After'].join('\n');
    const result = parseHeadings(src);
    expect(result.map((h) => h.text)).toEqual(['Before', 'After']);
  });

  it('strips markdown formatting from heading text and slug', () => {
    const src = '## **Bold** `code` [link] #tag';
    const [h] = parseHeadings(src);
    expect(h).toEqual({ level: 2, text: 'Bold code link tag', slug: 'bold-code-link-tag' });
  });

  it('returns an empty list for a document with no matching headings', () => {
    expect(parseHeadings('Just a paragraph.')).toEqual([]);
  });

  it('handles fence markers with leading whitespace', () => {
    const src = ['## Out', '  ```', '## Hidden', '  ```', '## Back'].join('\n');
    expect(parseHeadings(src).map((h) => h.text)).toEqual(['Out', 'Back']);
  });

  it('deduplicates slugs by appending -2, -3, … so anchor links stay unique', () => {
    const src = ['## Same', '## Same', '## Same'].join('\n');
    expect(parseHeadings(src).map((h) => h.slug)).toEqual(['same', 'same-2', 'same-3']);
  });
});

describe('renderTOC', () => {
  it('returns empty string for fewer than 3 headings', () => {
    expect(renderTOC([])).toBe('');
    expect(
      renderTOC([
        { level: 2, text: 'a', slug: 'a' },
        { level: 2, text: 'b', slug: 'b' },
      ]),
    ).toBe('');
  });

  it('renders a container with links when there are 3+ headings', () => {
    const html = renderTOC([
      { level: 2, text: 'One', slug: 'one' },
      { level: 3, text: 'Two', slug: 'two' },
      { level: 4, text: 'Three', slug: 'three' },
    ]);
    expect(html).toContain('class="toc-container"');
    expect(html).toContain('<li class="toc-h2"><a href="#one">One</a></li>');
    expect(html).toContain('<li class="toc-h3"><a href="#two">Two</a></li>');
    expect(html).toContain('<li class="toc-h4"><a href="#three">Three</a></li>');
  });
});

describe('generateTOC', () => {
  it('returns empty string for documents with <3 headings', () => {
    expect(generateTOC('## Only one')).toBe('');
  });

  it('renders the full TOC end-to-end', () => {
    const src = ['## A', '### B', '#### C'].join('\n');
    const html = generateTOC(src);
    expect(html).toContain('<a href="#a">A</a>');
    expect(html).toContain('<a href="#b">B</a>');
    expect(html).toContain('<a href="#c">C</a>');
  });
});
