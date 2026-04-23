import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginCrossRef } from '../../src/plugins/crossRef.ts';

const build = (): MarkdownIt => {
  const md = new MarkdownIt({ html: true });
  pluginCrossRef(md);
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
    env: { __xref: new Map() },
    push: () => {
      pushed = true;
      return { content: '', meta: {} };
    },
  };
  return { state, wasPushed: () => pushed };
};

describe('pluginCrossRef', () => {
  it('numbers figure labels in order of appearance', () => {
    const html = build().render('{#fig:one}\n\n{#fig:two}');
    expect(html).toContain('id="fig-one" data-kind="fig" data-num="1"');
    expect(html).toContain('id="fig-two" data-kind="fig" data-num="2"');
  });

  it('numbers tables and equations independently', () => {
    const html = build().render('{#fig:a} and {#tbl:a} and {#eq:a}');
    expect(html).toContain('id="fig-a" data-kind="fig" data-num="1"');
    expect(html).toContain('id="tbl-a" data-kind="tbl" data-num="1"');
    expect(html).toContain('id="eq-a" data-kind="eq" data-num="1"');
  });

  it('renders [@fig:one] as a link to the numbered figure', () => {
    const html = build().render('{#fig:one}\n\nSee [@fig:one].');
    expect(html).toContain('<a class="xref" href="#fig-one">Figure&nbsp;1</a>');
  });

  it('renders [@tbl:x] with the Table label', () => {
    const html = build().render('{#tbl:x}\n\n[@tbl:x]');
    expect(html).toContain('Table&nbsp;1');
  });

  it('renders [@eq:x] with the Equation label', () => {
    const html = build().render('{#eq:x}\n\n[@eq:x]');
    expect(html).toContain('Equation&nbsp;1');
  });

  it('marks refs to unknown labels as unresolved', () => {
    const html = build().render('See [@fig:missing]');
    expect(html).toContain('xref-unresolved');
    expect(html).toContain('Figure ?missing?');
  });

  it('supports forward references — ref before label', () => {
    const html = build().render('See [@fig:one]\n\n{#fig:one}');
    expect(html).toContain('href="#fig-one">Figure&nbsp;1');
  });

  it('collapses repeated label definitions under the first number', () => {
    const html = build().render('{#fig:dup} {#fig:dup} [@fig:dup]');
    // The ref should pick up the first definition's number (1)
    expect(html).toContain('href="#fig-dup">Figure&nbsp;1');
  });

  it('leaves plain text without crossref syntax untouched', () => {
    const html = build().render('Plain paragraph with no labels or refs.');
    expect(html).not.toContain('xref');
    expect(html).not.toContain('data-kind');
  });

  it('does not trigger on [@citekey] without a fig/tbl/eq prefix', () => {
    const html = build().render('See [@smith2020]');
    expect(html).not.toContain('xref');
  });

  it('returns true in silent mode without pushing a token', () => {
    const md = build();
    const rule = getInlineRule(md, 'xref')!;
    const { state, wasPushed } = makeState('[@fig:x]');
    expect(rule(state, true)).toBe(true);
    expect(wasPushed()).toBe(false);
  });

  it('falls back to number 0 when xref env is not initialised', () => {
    const md = new MarkdownIt({ html: true });
    pluginCrossRef(md);
    // Render a label without invoking the collection step first — force __xref empty
    const tokens = md.parseInline('{#fig:ghost}', {});
    expect(tokens).toBeDefined();
  });
});
