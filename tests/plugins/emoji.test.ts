import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { EMOJI_DATA, pluginEmoji } from '../../src/plugins/emoji.ts';

const build = (data: Record<string, string> = EMOJI_DATA) => {
  const md = new MarkdownIt({ html: true });
  pluginEmoji(md, data);
  return md;
};

const getInlineRule = (md: MarkdownIt) => {
  const rules = (md.inline as unknown as { ruler: { __rules__: { name: string; fn: unknown }[] } })
    .ruler.__rules__;
  return rules.find((r) => r.name === 'emoji')?.fn as (state: unknown, silent: boolean) => boolean;
};

const makeState = (src: string, pos = 0) => {
  let pushed = false;
  const state = {
    src,
    pos,
    posMax: src.length,
    push: () => {
      pushed = true;
      return { content: '', markup: '' };
    },
  };
  return { state, wasPushed: () => pushed };
};

describe('pluginEmoji', () => {
  it('replaces :smile: with the emoji character', () => {
    const html = build().render('hello :smile: world');
    expect(html).toContain('😄');
  });

  it('renders multiple shortcodes on a line', () => {
    const html = build().render(':rocket: launch :tada:');
    expect(html).toContain('🚀');
    expect(html).toContain('🎉');
  });

  it('leaves unknown shortcodes untouched', () => {
    const html = build().render('this :notarealcode: stays');
    expect(html).toContain(':notarealcode:');
  });

  it('ignores text that has no colons', () => {
    const html = build().render('plain text');
    expect(html).not.toContain('<span class="emoji"');
  });

  it('leaves :: empty shortcode alone', () => {
    const html = build().render('a :: b');
    expect(html).toContain(': b');
  });

  it('leaves a dangling colon alone', () => {
    const html = build().render('no closing :smile');
    expect(html).toContain(':smile');
  });

  it('rejects shortcodes with invalid characters', () => {
    const html = build().render(':bad name:');
    expect(html).toContain(':bad name:');
  });

  it('escapes HTML in emoji values', () => {
    const html = build({ evil: '<script>' }).render(':evil:');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('handles shortcodes with hyphens, underscores, plus and digits', () => {
    const html = build({ foo_bar: 'A', 'foo-bar': 'B', 'foo+1': 'C', foo1: 'D' }).render(
      ':foo_bar: :foo-bar: :foo+1: :foo1:',
    );
    expect(html).toContain('A');
    expect(html).toContain('B');
    expect(html).toContain('C');
    expect(html).toContain('D');
  });

  it('exports a non-empty default EMOJI_DATA', () => {
    expect(Object.keys(EMOJI_DATA).length).toBeGreaterThan(20);
    expect(EMOJI_DATA.smile).toBe('😄');
  });

  it('returns false when the rule is called not at a colon', () => {
    const md = build();
    const rule = getInlineRule(md);
    const { state, wasPushed } = makeState('abc');
    expect(rule(state, false)).toBe(false);
    expect(wasPushed()).toBe(false);
  });

  it('returns true without pushing in silent mode', () => {
    const md = build();
    const rule = getInlineRule(md);
    const { state, wasPushed } = makeState(':smile:');
    expect(rule(state, true)).toBe(true);
    expect(wasPushed()).toBe(false);
  });

  it('returns false for unknown shortcode even when silent', () => {
    const md = build();
    const rule = getInlineRule(md);
    const { state, wasPushed } = makeState(':unknown:');
    expect(rule(state, true)).toBe(false);
    expect(wasPushed()).toBe(false);
  });

  it('returns false for empty shortcode in silent mode', () => {
    const md = build();
    const rule = getInlineRule(md);
    const { state, wasPushed } = makeState('::');
    expect(rule(state, true)).toBe(false);
    expect(wasPushed()).toBe(false);
  });

  it('returns false when there is no closing colon', () => {
    const md = build();
    const rule = getInlineRule(md);
    const { state, wasPushed } = makeState(':smile');
    expect(rule(state, false)).toBe(false);
    expect(wasPushed()).toBe(false);
  });

  it('returns false for an invalid-char shortcode in silent mode', () => {
    const md = build();
    const rule = getInlineRule(md);
    const { state, wasPushed } = makeState(':bad name:');
    expect(rule(state, true)).toBe(false);
    expect(wasPushed()).toBe(false);
  });
});
