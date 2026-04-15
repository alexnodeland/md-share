import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { CALLOUT_ICONS, pluginObsidianCallouts } from '../../src/plugins/obsidianCallouts.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginObsidianCallouts(md);
  return md;
};

describe('pluginObsidianCallouts', () => {
  it('renders > [!note] as a callout div with title', () => {
    const html = build().render('> [!note] Heading\n> body here');
    expect(html).toContain('class="callout callout-note"');
    expect(html).toContain('Heading');
    expect(html).toContain('body here');
    expect(html).toContain(CALLOUT_ICONS.note);
  });

  it('defaults the title to capitalized type when no title is provided', () => {
    const html = build().render('> [!warning]\n> content');
    expect(html).toContain('> Warning</div>');
    expect(html).toContain('callout-warning');
    expect(html).toContain('content');
  });

  it('uses the fallback icon (ℹ) for unknown callout types', () => {
    const html = build().render('> [!mystery] Hi\n> body');
    expect(html).toContain('callout-mystery');
    expect(html).toContain('ℹ');
  });

  it('supports every defined icon type', () => {
    for (const type of Object.keys(CALLOUT_ICONS)) {
      const html = build().render(`> [!${type}] t\n> b`);
      expect(html).toContain(`callout-${type}`);
    }
  });

  it('leaves plain blockquotes alone', () => {
    const html = build().render('> just a quote');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('class="callout');
  });

  it('leaves an empty blockquote (no inline content) alone', () => {
    // `>` followed by nothing — a blockquote with no inline token inside.
    const html = build().render('>\n');
    expect(html).not.toContain('class="callout');
  });

  it('escapes HTML in the title', () => {
    const html = build().render('> [!note] <script>\n> b');
    expect(html).toContain('&lt;script&gt;');
  });

  it('composes with existing blockquote_open/close rules for plain blockquotes', () => {
    const md = new MarkdownIt({ html: true });
    md.renderer.rules.blockquote_open = (tokens, idx, opts, _env, self) =>
      `<!--O-->${self.renderToken(tokens, idx, opts)}`;
    md.renderer.rules.blockquote_close = (tokens, idx, opts, _env, self) =>
      `${self.renderToken(tokens, idx, opts)}<!--C-->`;
    pluginObsidianCallouts(md);
    const html = md.render('> a plain quote');
    expect(html).toContain('<!--O-->');
    expect(html).toContain('<!--C-->');
  });
});
