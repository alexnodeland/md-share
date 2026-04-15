import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { addHeadingAnchors, slugifyHeading } from '../../src/plugins/anchors.ts';

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

describe('addHeadingAnchors', () => {
  it('adds an id attribute matching the slug', () => {
    const html = build().render('## My Section');
    expect(html).toContain('<h2 id="my-section">');
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
