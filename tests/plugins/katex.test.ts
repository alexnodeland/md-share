import katex from 'katex';
import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginKaTeX } from '../../src/plugins/katex.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginKaTeX(md, katex);
  return md;
};

describe('pluginKaTeX', () => {
  it('renders inline math between single $', () => {
    const html = build().render('Einstein said $E = mc^2$ famously.');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('katex-display');
  });

  it('renders display math between $$ pairs on their own lines', () => {
    const html = build().render('$$\n\\int x\\,dx\n$$');
    expect(html).toContain('katex-display');
  });

  it('renders katex-error div on invalid inline LaTeX when throwOnError is true', () => {
    const md = new MarkdownIt({ html: true });
    pluginKaTeX(md, {
      renderToString: () => {
        throw new Error('bad');
      },
    } as unknown as typeof katex);
    const html = md.render('bad $x$ math');
    expect(html).toContain('<code>x</code>');
  });

  it('renders katex-error pre on invalid block LaTeX when renderToString throws', () => {
    const md = new MarkdownIt({ html: true });
    pluginKaTeX(md, {
      renderToString: () => {
        throw new Error('bad');
      },
    } as unknown as typeof katex);
    const html = md.render('$$\nbadblock\n$$');
    expect(html).toContain('class="katex-error"');
    expect(html).toContain('badblock');
  });

  it('ignores a single $ without a closing match', () => {
    const html = build().render('This is $ a price tag');
    expect(html).not.toContain('katex');
  });

  it('ignores adjacent $$ as inline (requires block form)', () => {
    const html = build().render('word $$ word');
    expect(html).not.toContain('katex');
  });

  it('ignores empty inline math $$ side-by-side', () => {
    const html = build().render('empty $$ marker');
    expect(html).not.toContain('class="katex"');
  });

  it('leaves document unchanged when block math has no closing $$', () => {
    const html = build().render('$$\nunterminated');
    expect(html).not.toContain('katex-display');
  });
});
