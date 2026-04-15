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
});
