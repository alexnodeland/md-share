// Integration: drive src/adapters/htmlToMd.ts end-to-end with real Turndown.
//
// Unit tests in tests/importers/html.test.ts fake Turndown so sanitizer +
// post-processing can be exercised in isolation. These tests run the whole
// pipeline (DOMParser sanitize → real Turndown → postProcess) to catch
// regressions that a fake Turndown would mask — e.g. a sanitizer rule
// drifting so a `<script>` survives into Turndown, or Turndown upstream
// changing how it emits lists.

import { describe, expect, it } from 'vitest';
import { browserHtmlToMd } from '../../../src/adapters/htmlToMd.ts';

describe('integration: HTML → Markdown via real Turndown', () => {
  it('converts a Google-Docs-style heading + paragraph + link', async () => {
    const html = `
      <h1>Title</h1>
      <p>Intro with a <a href="https://example.com">link</a> in it.</p>
    `;
    const md = await browserHtmlToMd.convert(html);
    expect(md).toContain('# Title');
    expect(md).toContain('[link](https://example.com)');
  });

  it('preserves a nested list with bold/italic', async () => {
    const html = `
      <ul>
        <li>plain</li>
        <li><strong>bold</strong></li>
        <li><em>italic</em></li>
      </ul>
    `;
    const md = await browserHtmlToMd.convert(html);
    // Turndown pads bullet markers to align with numbered lists, so the
    // marker is `-\s+` rather than `- `. Match on the structural pattern.
    expect(md).toMatch(/^-\s+plain$/m);
    expect(md).toMatch(/^-\s+\*\*bold\*\*$/m);
    expect(md).toMatch(/^-\s+\*italic\*$/m);
  });

  it('renders a pipe table with header row', async () => {
    const html = `
      <table>
        <thead><tr><th>A</th><th>B</th></tr></thead>
        <tbody><tr><td>1</td><td>2</td></tr></tbody>
      </table>
    `;
    const md = await browserHtmlToMd.convert(html);
    // Turndown's gfm-tables support isn't wired — we just expect cells to
    // survive in *some* form readable by a Markdown reader.
    expect(md).toContain('A');
    expect(md).toContain('B');
    expect(md).toContain('1');
    expect(md).toContain('2');
  });

  it('preserves image alt text on <img>', async () => {
    const md = await browserHtmlToMd.convert('<p><img src="cat.png" alt="a cat"></p>');
    expect(md).toContain('![a cat](cat.png)');
  });

  it('renders inline <code>', async () => {
    const md = await browserHtmlToMd.convert('<p>Use <code>npm</code> please.</p>');
    expect(md).toContain('`npm`');
  });

  it('applies the custom strikethrough rule for <del> and <s>', async () => {
    const md = await browserHtmlToMd.convert('<p><del>gone</del> and <s>done</s></p>');
    expect(md).toContain('~~gone~~');
    expect(md).toContain('~~done~~');
  });

  it('strips <script> blocks before Turndown sees them', async () => {
    const md = await browserHtmlToMd.convert('<p>ok</p><script>alert(1)</script><p>after</p>');
    expect(md).not.toContain('alert(1)');
    expect(md).not.toContain('<script');
    expect(md).toContain('ok');
    expect(md).toContain('after');
  });

  it('drops on* event handlers from surviving tags', async () => {
    const md = await browserHtmlToMd.convert(
      '<a href="https://example.com" onclick="steal()">click</a>',
    );
    expect(md).toContain('[click](https://example.com)');
    expect(md).not.toContain('onclick');
    expect(md).not.toContain('steal()');
  });

  it('refuses javascript: URIs on anchors', async () => {
    const md = await browserHtmlToMd.convert('<a href="javascript:alert(1)">bad</a>');
    expect(md).not.toContain('javascript:');
    expect(md).not.toContain('alert');
  });

  it('refuses javascript: URIs on images', async () => {
    const md = await browserHtmlToMd.convert('<img src="javascript:alert(1)" alt="bad">');
    expect(md).not.toContain('javascript:');
  });

  it('strips <style> and <link> tags entirely', async () => {
    // `<link href=…>` points at a data URL so happy-dom does not fire a
    // background fetch during DOMParser; the sanitizer still drops the tag.
    const md = await browserHtmlToMd.convert(
      '<style>.x{color:red}</style>' +
        '<link rel="stylesheet" href="data:text/css,body%7B%7D">' +
        '<p>body text</p>',
    );
    expect(md).not.toContain('color:red');
    expect(md).not.toContain('stylesheet');
    expect(md).toContain('body text');
  });

  it('returns an empty-ish string for empty input', async () => {
    expect((await browserHtmlToMd.convert('')).trim()).toBe('');
  });

  it('returns an empty-ish string for whitespace-only input', async () => {
    expect((await browserHtmlToMd.convert('   \n\t  ')).trim()).toBe('');
  });
});
