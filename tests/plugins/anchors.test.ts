import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { addHeadingAnchors, inlineText } from '../../src/plugins/anchors.ts';
import type { RenderEnv } from '../../src/types.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  addHeadingAnchors(md);
  return md;
};

describe('addHeadingAnchors', () => {
  it('adds an id attribute matching the slug', () => {
    const html = build().render('## My Section');
    expect(html).toContain('<h2 id="my-section">');
  });

  it('emits a heading-anchor link pointing at the slug', () => {
    const html = build().render('## My Section');
    expect(html).toContain(
      '<h2 id="my-section"><a class="heading-anchor" href="#my-section" aria-label="Copy link to this heading">',
    );
    expect(html).toContain('class="heading-anchor-icon"');
  });

  it('skips headings whose text has no slug-able characters', () => {
    const html = build().render('## !!!');
    expect(html).toContain('<h2>!!!</h2>');
    expect(html).not.toContain('heading-anchor');
  });

  it('applies to all heading levels', () => {
    const html = build().render('# One\n## Two\n### Three');
    expect(html).toContain('<h1 id="one">');
    expect(html).toContain('<h2 id="two">');
    expect(html).toContain('<h3 id="three">');
  });

  it('composes with an existing heading_open rule', () => {
    const md = new MarkdownIt({ html: true });
    md.renderer.rules.heading_open = (tokens, idx, opts, _env, self) =>
      `<!--prior-->${self.renderToken(tokens, idx, opts)}`;
    addHeadingAnchors(md);
    const html = md.render('## Hello');
    expect(html).toContain('<!--prior-->');
    expect(html).toContain('id="hello"');
  });

  it('deduplicates collisions by appending -2, -3, …', () => {
    const html = build().render('## Same\n## Same\n## Same');
    expect(html).toContain('<h2 id="same">');
    expect(html).toContain('<h2 id="same-2">');
    expect(html).toContain('<h2 id="same-3">');
  });

  it('resets the slug counter per-render (fresh env each call)', () => {
    const md = build();
    const first = md.render('## Same');
    const second = md.render('## Same');
    expect(first).toContain('<h2 id="same">');
    expect(second).toContain('<h2 id="same">');
  });

  it('records the outline in env.headings using rendered text', () => {
    const env: RenderEnv = {};
    build().render('# Doc\n## A `code` [link](u)\nSetext\n---\n```\n## not a heading\n```', env);
    expect(env.headings).toEqual([
      { level: 1, text: 'Doc', slug: 'doc' },
      { level: 2, text: 'A code link', slug: 'a-code-link' },
      { level: 2, text: 'Setext', slug: 'setext' },
    ]);
  });

  it('dedupes across every level so the TOC and ids agree', () => {
    const env: RenderEnv = {};
    const html = build().render('# Intro\n## Intro', env);
    expect(html).toContain('<h2 id="intro-2">');
    expect(env.headings?.[1]?.slug).toBe('intro-2');
  });

  it('gives non-ASCII headings real ids', () => {
    expect(build().render('## 日本語')).toContain('<h2 id="日本語">');
  });
});

describe('inlineText', () => {
  it('joins text, code, image alt text and line breaks, skipping raw HTML', () => {
    const md = new MarkdownIt({ html: true, breaks: false });
    const inline = md.parse('## a <b>b</b> `c` ![d](e.png)', {})[1]!;
    expect(inlineText(inline)).toBe('a b c d');
    const para = md.parse('x\ny  \nz', {})[1]!;
    expect(inlineText(para)).toBe('x y z');
  });

  it('returns empty for a token without children', () => {
    const md = new MarkdownIt();
    expect(inlineText(md.parse('para', {})[0]!)).toBe('');
  });
});
