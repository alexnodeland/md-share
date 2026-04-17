import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { applySafeLinks } from '../../src/plugins/safeLinks.ts';

const build = () => {
  const md = new MarkdownIt({ linkify: true });
  applySafeLinks(md);
  return md;
};

describe('applySafeLinks', () => {
  it('adds target=_blank and rel=noopener noreferrer to http links', () => {
    const html = build().render('[x](http://example.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('adds safe attributes to https links', () => {
    const html = build().render('[x](https://example.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('adds safe attributes to scheme-relative //host links', () => {
    const html = build().render('[x](//example.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('leaves in-page fragment links alone', () => {
    const html = build().render('[anchor](#section)');
    expect(html).not.toContain('target=');
    expect(html).not.toContain('rel=');
  });

  it('leaves relative links alone', () => {
    const html = build().render('[rel](./file.md)');
    expect(html).not.toContain('target=');
    expect(html).not.toContain('rel=');
  });

  it('leaves mailto links alone', () => {
    const html = build().render('[email](mailto:x@example.com)');
    expect(html).not.toContain('target=');
    expect(html).not.toContain('rel=');
  });

  it('composes with an existing link_open renderer', () => {
    const md = new MarkdownIt();
    md.renderer.rules.link_open = (tokens, idx, opts, _env, self) =>
      `<!--L-->${self.renderToken(tokens, idx, opts)}`;
    applySafeLinks(md);
    const html = md.render('[x](https://example.com)');
    expect(html).toContain('<!--L-->');
    expect(html).toContain('target="_blank"');
  });

  it('defaults missing href to empty and skips', () => {
    const md = new MarkdownIt();
    applySafeLinks(md);
    md.inline.ruler.push('bare_link', (state) => {
      if (state.src[state.pos] !== '§') return false;
      const open = state.push('link_open', 'a', 1);
      open.attrs = null;
      const text = state.push('text', '', 0);
      text.content = 'X';
      state.push('link_close', 'a', -1);
      state.pos++;
      return true;
    });
    const html = md.render('§');
    expect(html).not.toContain('target=');
    expect(html).not.toContain('rel=');
  });
});
