import { describe, expect, it } from 'vitest';
import { buildStandaloneHtml, katexCssUrl } from '../src/standaloneHtml.ts';

const base = {
  title: 'Notes',
  bodyHtml: '<p>hi</p>',
  css: '.rendered{color:red}',
  theme: 'dark' as const,
  katexVersion: '0.16.47',
};

describe('buildStandaloneHtml', () => {
  it('wraps the body in a themed, titled document', () => {
    const html = buildStandaloneHtml(base);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html lang="en" data-theme="dark">');
    expect(html).toContain('<title>Notes</title>');
    expect(html).toContain('<main class="rendered"><p>hi</p></main>');
  });

  it('inlines the app CSS and lets the page scroll', () => {
    const html = buildStandaloneHtml(base);
    expect(html).toContain('.rendered{color:red}');
    expect(html).toContain('html,body{height:auto;overflow:auto}');
  });

  it('escapes the title', () => {
    expect(buildStandaloneHtml({ ...base, title: '</title><script>' })).toContain(
      '<title>&lt;/title&gt;&lt;script&gt;</title>',
    );
  });

  it('falls back to a generic title', () => {
    expect(buildStandaloneHtml({ ...base, title: null })).toContain('<title>Document</title>');
  });

  it('links the matching KaTeX CSS only when the body contains math', () => {
    const url = katexCssUrl('0.16.47');
    expect(url).toBe('https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css');
    expect(buildStandaloneHtml(base)).not.toContain('katex.min.css');
    const math = { ...base, bodyHtml: '<span class="katex">x</span>' };
    expect(buildStandaloneHtml(math)).toContain(`<link rel="stylesheet" href="${url}"`);
    expect(buildStandaloneHtml({ ...math, katexVersion: null })).not.toContain('katex.min.css');
  });

  it('honors the light theme', () => {
    expect(buildStandaloneHtml({ ...base, theme: 'light' })).toContain('data-theme="light"');
  });
});
