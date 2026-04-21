import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginPandocCite } from '../../src/plugins/pandocCite.ts';

const build = (): MarkdownIt => {
  const md = new MarkdownIt({ html: false });
  pluginPandocCite(md);
  return md;
};

const getInlineRule = (md: MarkdownIt, name: string) => {
  const rules = (md.inline as unknown as { ruler: { __rules__: { name: string; fn: unknown }[] } })
    .ruler.__rules__;
  return rules.find((r) => r.name === name)?.fn as
    | ((state: unknown, silent: boolean) => boolean)
    | undefined;
};

const makeState = (src: string, pos = 0) => {
  let pushed = false;
  const state = {
    src,
    pos,
    posMax: src.length,
    env: {},
    push: () => {
      pushed = true;
      return { content: '', meta: {} };
    },
  };
  return { state, wasPushed: () => pushed };
};

describe('pluginPandocCite', () => {
  it('renders [@key] as a numbered superscript linking to #ref-key', () => {
    const html = build().render('See [@smith2020] for details.');
    expect(html).toContain('<sup class="pandoc-cite"><a href="#ref-smith2020">[1]</a></sup>');
  });

  it('assigns sequential numbers to distinct keys in order of first appearance', () => {
    const html = build().render('A [@a], B [@b], C [@c].');
    expect(html).toMatch(/href="#ref-a">\[1\]/);
    expect(html).toMatch(/href="#ref-b">\[2\]/);
    expect(html).toMatch(/href="#ref-c">\[3\]/);
  });

  it('re-uses the same number when a key is cited again', () => {
    const html = build().render('See [@foo] and later [@foo] once more.');
    const matches = html.match(/href="#ref-foo">\[1\]/g);
    expect(matches?.length).toBe(2);
  });

  it('leaves footnote-style refs ([^foo]) untouched', () => {
    const html = build().render('Plain [^1] stays as-is.');
    expect(html).not.toContain('pandoc-cite');
  });

  it('leaves ordinary bracket text ([@not a key]) untouched when the key has spaces', () => {
    const html = build().render('Look at [@not a key] here.');
    expect(html).not.toContain('pandoc-cite');
  });

  it('escapes hostile characters that slip into a key', () => {
    const md = build();
    const html = md.render('[@<script>]');
    // key containing < is rejected by CITE_KEY_RE
    expect(html).not.toContain('pandoc-cite');
    expect(html).not.toContain('<script>');
  });

  it('accepts keys with hyphens, colons, and dots', () => {
    const html = build().render('[@smith.2020-a] and [@fig:one]');
    expect(html).toContain('href="#ref-smith.2020-a">[1]');
    expect(html).toContain('href="#ref-fig:one">[2]');
  });

  it('ignores a [@key without its closing bracket', () => {
    const html = build().render('[@foo never closed');
    expect(html).not.toContain('pandoc-cite');
  });

  it('escapes the href-embedded key to avoid attribute injection', () => {
    // key regex rejects quotes, so this should not produce a cite at all
    const html = build().render('[@"onclick="alert(1)]');
    expect(html).not.toContain('pandoc-cite');
  });

  it('returns true in silent mode without pushing a token', () => {
    const md = build();
    const rule = getInlineRule(md, 'pandoc_cite')!;
    const { state, wasPushed } = makeState('[@key]');
    expect(rule(state, true)).toBe(true);
    expect(wasPushed()).toBe(false);
  });
});
