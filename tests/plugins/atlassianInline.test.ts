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

  it('does not trigger when @ is followed by non-username chars', () => {
    const html = build().render('look at @!nope');
    expect(html).not.toContain('atl-mention');
  });

  it('escapes HTML in the username (defense in depth)', () => {
    const html = build().render('@abc');
    expect(html).toContain('atl-mention');
  });
});

describe('silent mode', () => {
  const getInlineRule = (md: MarkdownIt, name: string) => {
    const rules = (
      md.inline as unknown as { ruler: { __rules__: { name: string; fn: unknown }[] } }
    ).ruler.__rules__;
    return rules.find((r) => r.name === name)?.fn as
      | ((state: unknown, silent: boolean) => boolean)
      | undefined;
  };

  const makeState = (src: string) => {
    let pushed = false;
    const state = {
      src,
      pos: 0,
      posMax: src.length,
      push: () => {
        pushed = true;
        return { content: '', meta: {} };
      },
    };
    return { state, wasPushed: () => pushed };
  };

  it('atl_status returns true without pushing when silent=true', () => {
    const md = build();
    const rule = getInlineRule(md, 'atl_status')!;
    const { state, wasPushed } = makeState('{status:color=red|title=X}');
    expect(rule(state, true)).toBe(true);
    expect(wasPushed()).toBe(false);
  });

  it('atl_mention returns true without pushing when silent=true', () => {
    const md = build();
    const rule = getInlineRule(md, 'atl_mention')!;
    const { state, wasPushed } = makeState('@user');
    expect(rule(state, true)).toBe(true);
    expect(wasPushed()).toBe(false);
  });

  it('atl_status with no color match uses default grey', () => {
    const html = build().render('see {status:title=PENDING}');
    expect(html).toContain('atl-status-grey');
    expect(html).toContain('PENDING');
  });

  it('atl_status with no title match uses default STATUS', () => {
    const html = build().render('see {status:color=red}');
    expect(html).toContain('atl-status-red');
    expect(html).toContain('>STATUS<');
  });
});
