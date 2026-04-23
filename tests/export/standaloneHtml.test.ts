import { describe, expect, it } from 'vitest';
import { buildStandaloneHtml } from '../../src/export/standaloneHtml.ts';

describe('buildStandaloneHtml', () => {
  const base = { title: 'Doc', body: '<p>hi</p>', css: 'p{color:red}' };

  it('emits a <!DOCTYPE html> declaration', () => {
    expect(buildStandaloneHtml(base)).toMatch(/^<!DOCTYPE html>/);
  });

  it('defaults theme to dark when unspecified', () => {
    expect(buildStandaloneHtml(base)).toContain('data-theme="dark"');
  });

  it('honors the theme option', () => {
    expect(buildStandaloneHtml({ ...base, theme: 'light' })).toContain('data-theme="light"');
  });

  it('inlines the provided CSS inside a <style> block', () => {
    expect(buildStandaloneHtml(base)).toContain('<style>p{color:red}</style>');
  });

  it('wraps the body in an <article class="rendered">', () => {
    expect(buildStandaloneHtml(base)).toMatch(/<article class="rendered">\s*<p>hi<\/p>/);
  });

  it('includes a CSP meta tag that forbids scripts', () => {
    const html = buildStandaloneHtml(base);
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("script-src 'none'");
  });

  it('escapes the title so hostile values cannot break out of the <title>', () => {
    expect(buildStandaloneHtml({ ...base, title: '</title><script>x' })).toContain(
      '&lt;/title&gt;&lt;script&gt;x',
    );
  });

  it('escapes the language attribute', () => {
    expect(buildStandaloneHtml({ ...base, lang: 'en-US" onclick="x' })).toContain(
      'lang="en-US&quot; onclick=&quot;x"',
    );
  });

  it('defaults lang to en when unspecified', () => {
    expect(buildStandaloneHtml(base)).toContain('lang="en"');
  });

  it('passes body HTML through verbatim (relies on sanitization upstream)', () => {
    const html = buildStandaloneHtml({ ...base, body: '<h1>Title</h1><p><em>x</em></p>' });
    expect(html).toContain('<h1>Title</h1><p><em>x</em></p>');
  });
});
