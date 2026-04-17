import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { addHeadingAnchors, slugifyHeading, uniqueSlug } from '../../src/plugins/anchors.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  addHeadingAnchors(md);
  return md;
};

describe('slugifyHeading', () => {
  it('lowercases, strips markdown chars, replaces spaces with dashes', () => {
    expect(slugifyHeading('**Bold** Heading')).toBe('bold-heading');
  });

  it('strips punctuation that is not word/space/dash', () => {
    expect(slugifyHeading('Hello, World!')).toBe('hello-world');
  });

  it('preserves existing dashes', () => {
    expect(slugifyHeading('foo-bar baz')).toBe('foo-bar-baz');
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug the first time', () => {
    const used = new Map<string, number>();
    expect(uniqueSlug('x', used)).toBe('x');
  });

  it('appends -2, -3 for repeated bases', () => {
    const used = new Map<string, number>();
    uniqueSlug('x', used);
    expect(uniqueSlug('x', used)).toBe('x-2');
    expect(uniqueSlug('x', used)).toBe('x-3');
  });

  it('tracks each base independently', () => {
    const used = new Map<string, number>();
    expect(uniqueSlug('a', used)).toBe('a');
    expect(uniqueSlug('b', used)).toBe('b');
    expect(uniqueSlug('a', used)).toBe('a-2');
  });
});

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
