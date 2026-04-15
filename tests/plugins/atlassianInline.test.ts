import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginAtlassianInline } from '../../src/plugins/atlassianInline.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginAtlassianInline(md);
  return md;
};

describe('atl_status', () => {
  it('renders {status:color=X|title=Y} with the color class and title text', () => {
    const html = build().render('status: {status:color=Green|title=DONE}');
    expect(html).toContain('<span class="atl-status atl-status-green">DONE</span>');
  });

  it('defaults color to grey and title to STATUS when missing', () => {
    const html = build().render('see {status:}');
    expect(html).toContain('atl-status-grey');
    expect(html).toContain('>STATUS<');
  });

  it('lowercases the color value', () => {
    const html = build().render('{status:color=RED|title=X}');
    expect(html).toContain('atl-status-red');
  });

  it('escapes HTML in the title', () => {
    const html = build().render('{status:color=blue|title=<b>BOLD</b>}');
    expect(html).toContain('&lt;b&gt;');
  });

  it('leaves unclosed {status: alone', () => {
    const html = build().render('plain {status: text');
    expect(html).not.toContain('atl-status');
  });
});

describe('atl_mention', () => {
  it('renders @user as a mention span', () => {
    const html = build().render('hi @alice');
    expect(html).toContain('<span class="atl-mention">@alice</span>');
  });

  it('supports dots and dashes in usernames', () => {
    const html = build().render('@jane.doe-smith reviewed');
    expect(html).toContain('>@jane.doe-smith<');
  });

  it('does not trigger inside a word boundary (email@domain)', () => {
    const html = build().render('email@domain');
    expect(html).not.toContain('atl-mention');
  });

  it('escapes HTML in the username (defense in depth)', () => {
    const html = build().render('@abc');
    expect(html).toContain('atl-mention');
  });
});
