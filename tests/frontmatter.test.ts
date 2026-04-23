import { describe, expect, it } from 'vitest';
import { parseFrontmatter, renderFrontmatter } from '../src/frontmatter.ts';

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

describe('parseFrontmatter', () => {
  it('extracts key/value pairs and returns the remaining body', () => {
    const source = '---\ntitle: Hello\nauthor: Ada\n---\n\n# Body';
    const result = parseFrontmatter(source);
    expect(result.meta).toEqual({ title: 'Hello', author: 'Ada' });
    expect(result.body).toBe('# Body');
    expect(result.dir).toBe('auto');
    expect(result.lang).toBeNull();
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
    const result = parseFrontmatter('# Just a heading\n');
    expect(result.meta).toEqual({});
    expect(result.body).toBe('# Just a heading\n');
    expect(result.dir).toBe('auto');
    expect(result.lang).toBeNull();
  });

  it('returns the source unchanged when the closing delimiter is missing', () => {
    const source = '---\ntitle: open\nbody without close';
    const result = parseFrontmatter(source);
    expect(result.meta).toEqual({});
    expect(result.body).toBe(source);
    expect(result.dir).toBe('auto');
    expect(result.lang).toBeNull();
  });

  it('returns the source unchanged when the block has no parsable keys', () => {
    const source = '---\n\n---\nhello';
    const result = parseFrontmatter(source);
    expect(result.meta).toEqual({});
    expect(result.body).toBe(source);
    expect(result.dir).toBe('auto');
    expect(result.lang).toBeNull();
  });

  it('ignores malformed lines (no colon or empty key)', () => {
    const { meta } = parseFrontmatter('---\nnot a pair\n: no key\ntitle: T\n---\n');
    expect(meta).toEqual({ title: 'T' });
  });

  it('parses dir: rtl (lowercase)', () => {
    expect(parseFrontmatter('---\ndir: rtl\n---\nbody').dir).toBe('rtl');
  });

  it('parses dir: ltr and dir: auto', () => {
    expect(parseFrontmatter('---\ndir: ltr\n---\nbody').dir).toBe('ltr');
    expect(parseFrontmatter('---\ndir: auto\n---\nbody').dir).toBe('auto');
  });

  it('normalizes uppercase dir to lowercase', () => {
    expect(parseFrontmatter('---\ndir: RTL\n---\nbody').dir).toBe('rtl');
  });

  it('defaults dir to auto when the value is unrecognized', () => {
    expect(parseFrontmatter('---\ndir: sideways\n---\nbody').dir).toBe('auto');
  });

  it('parses a lang value', () => {
    expect(parseFrontmatter('---\nlang: he\n---\nbody').lang).toBe('he');
  });

  it('treats blank lang as null', () => {
    expect(parseFrontmatter('---\nlang: ""\ntitle: x\n---\nbody').lang).toBeNull();
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
