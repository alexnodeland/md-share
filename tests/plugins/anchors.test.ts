import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { addHeadingAnchors } from '../../src/plugins/anchors.ts';

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

  it('does not emit an anchor link when the heading has no id', () => {
    const md = build();
    const parsed = md.parse('## Head', {});
    const tokens = parsed.filter((t) => t.type !== 'inline');
    const rule = md.renderer.rules.heading_open!;
    const out = rule(tokens, 0, md.options, {}, md.renderer);
    expect(out).not.toContain('heading-anchor');
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

  it('does not set id when there is no inline token following heading_open', () => {
    const md = build();
    const parsed = md.parse('## Head', {});
    // Splice out the inline token so next is non-inline (heading_close)
    const tokens = parsed.filter((t) => t.type !== 'inline');
    let attrSetCalled = false;
    tokens[0]!.attrSet = () => {
      attrSetCalled = true;
    };
    const rule = md.renderer.rules.heading_open!;
    rule(tokens, 0, md.options, {}, md.renderer);
    expect(attrSetCalled).toBe(false);
  });
});
