import { describe, expect, it } from 'vitest';
import { parseFrontmatter, renderFrontmatter } from '../src/frontmatter.ts';

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

describe('parseFrontmatter', () => {
  it('extracts key/value pairs and returns the remaining body', () => {
    const source = '---\ntitle: Hello\nauthor: Ada\n---\n\n# Body';
    const { meta, body } = parseFrontmatter(source);
    expect(meta).toEqual({ title: 'Hello', author: 'Ada' });
    expect(body).toBe('# Body');
  });

  it('strips surrounding quotes from values', () => {
    const { meta } = parseFrontmatter('---\ntitle: "Quoted"\nslug: \'single\'\n---\n');
    expect(meta).toEqual({ title: 'Quoted', slug: 'single' });
  });

  it('tolerates blank lines and YAML comments', () => {
    const source = '---\n# a comment\n\ntitle: T\n---\nbody';
    const { meta, body } = parseFrontmatter(source);
    expect(meta).toEqual({ title: 'T' });
    expect(body).toBe('body');
  });

  it('tolerates CRLF line endings', () => {
    const { meta, body } = parseFrontmatter('---\r\ntitle: R\r\n---\r\nbody');
    expect(meta).toEqual({ title: 'R' });
    expect(body).toBe('body');
  });

  it('returns the source unchanged when no opening delimiter is present', () => {
    const { meta, body } = parseFrontmatter('# Just a heading\n');
    expect(meta).toEqual({});
    expect(body).toBe('# Just a heading\n');
  });

  it('returns the source unchanged when the closing delimiter is missing', () => {
    const source = '---\ntitle: open\nbody without close';
    const { meta, body } = parseFrontmatter(source);
    expect(meta).toEqual({});
    expect(body).toBe(source);
  });

  it('returns the source unchanged when the block has no parsable keys', () => {
    const source = '---\n\n---\nhello';
    const { meta, body } = parseFrontmatter(source);
    expect(meta).toEqual({});
    expect(body).toBe(source);
  });

  it('ignores malformed lines (no colon or empty key)', () => {
    const { meta } = parseFrontmatter('---\nnot a pair\n: no key\ntitle: T\n---\n');
    expect(meta).toEqual({ title: 'T' });
  });
});

describe('renderFrontmatter', () => {
  it('renders a definition list with escaped values', () => {
    const html = renderFrontmatter({ title: 'A & B', author: '<script>' }, escapeHtml);
    expect(html).toBe(
      '<dl class="frontmatter"><dt>title</dt><dd>A &amp; B</dd><dt>author</dt><dd>&lt;script&gt;</dd></dl>',
    );
  });

  it('returns an empty string when no metadata is present', () => {
    expect(renderFrontmatter({}, escapeHtml)).toBe('');
  });
});
