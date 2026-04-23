import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginNotion } from '../../src/plugins/notion.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginNotion(md);
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
    push: () => {
      pushed = true;
      return { content: '', meta: {} };
    },
  };
  return { state, wasPushed: () => pushed };
};

describe('notion callout', () => {
  it('renders {callout:blue}…{callout} as an <aside> with data-color', () => {
    const html = build().render('{callout:blue}\nhello **world**\n{callout}');
    expect(html).toContain('<aside class="notion-callout" data-color="blue">');
    expect(html).toContain('<strong>world</strong>');
    expect(html).toContain('</aside>');
  });

  it('supports every documented color', () => {
    const colors = ['blue', 'gray', 'brown', 'red', 'orange', 'yellow', 'green', 'purple', 'pink'];
    for (const c of colors) {
      const html = build().render(`{callout:${c}}\nbody\n{callout}`);
      expect(html).toContain(`data-color="${c}"`);
    }
  });

  it('lowercases the color value', () => {
    const html = build().render('{callout:BLUE}\ntext\n{callout}');
    expect(html).toContain('data-color="blue"');
  });

  it('leaves unknown colors alone (no aside)', () => {
    const html = build().render('{callout:neon}\ntext\n{callout}');
    expect(html).not.toContain('notion-callout');
    expect(html).toContain('{callout:neon}');
  });

  it('renders mentions and slash commands inside a callout', () => {
    const html = build().render('{callout:green}\nping @alice then run /deploy\n{callout}');
    expect(html).toContain('notion-mention');
    expect(html).toContain('notion-slash');
  });

  it('parses block Markdown inside the callout body', () => {
    const html = build().render(
      '{callout:blue}\n**bold** and *italic*\n\n- item 1\n- item 2\n{callout}',
    );
    expect(html).toMatch(
      /<aside[^>]*>[\s\S]*<strong>bold<\/strong>[\s\S]*<em>italic<\/em>[\s\S]*<ul>[\s\S]*<li>item 1<\/li>[\s\S]*<\/aside>/,
    );
  });
});

describe('notion toggle', () => {
  it('renders ?> summary + > body as a collapsed <details>', () => {
    const html = build().render('?> Click me\n> hidden body\n> more body');
    expect(html).toContain('<details class="notion-toggle">');
    expect(html).toContain('<summary>Click me</summary>');
    expect(html).toContain('hidden body');
    expect(html).toContain('more body');
  });

  it('defaults the summary to "Toggle" when empty', () => {
    const html = build().render('?>\n> body');
    expect(html).toContain('<summary>Toggle</summary>');
  });

  it('escapes HTML in the summary', () => {
    const html = build().render('?> <script>\n> body');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders a summary-only toggle with no body lines', () => {
    const html = build().render('?> Just a label\n\nNot a body line');
    expect(html).toContain('<summary>Just a label</summary>');
    expect(html).toContain('Not a body line');
  });

  it('leaves plain lines alone', () => {
    const html = build().render('just a paragraph\n\nanother one');
    expect(html).not.toContain('notion-toggle');
    expect(html).toContain('just a paragraph');
  });

  it('strips a single leading space after > in body lines', () => {
    const html = build().render('?> Title\n> body');
    // The body line has its leading "> " stripped and renders as a paragraph.
    expect(html).toContain('<details class="notion-toggle">');
    expect(html).toMatch(/<summary>Title<\/summary>[\s\S]*?<p>body<\/p>/);
  });

  it('parses block Markdown inside the toggle body', () => {
    const html = build().render('?> Summary\n> **bold**\n> - a\n> - b');
    expect(html).toMatch(
      /<details[^>]*>[\s\S]*<summary>Summary<\/summary>[\s\S]*<strong>bold<\/strong>[\s\S]*<ul>[\s\S]*<li>a<\/li>[\s\S]*<\/details>/,
    );
  });
});

describe('notion mention', () => {
  it('renders @user as a mention span', () => {
    const html = build().render('hi @alice');
    expect(html).toContain('<span class="notion-mention">@alice</span>');
  });

  it('supports dots and dashes in usernames', () => {
    const html = build().render('@jane.doe-smith reviewed');
    expect(html).toContain('>@jane.doe-smith<');
  });

  it('does not trigger inside a word boundary (email@domain)', () => {
    const html = build().render('email@domain');
    expect(html).not.toContain('notion-mention');
  });

  it('does not trigger when @ is followed by non-username chars', () => {
    const html = build().render('look at @!nope');
    expect(html).not.toContain('notion-mention');
  });

  it('does not trigger inside inline code', () => {
    const html = build().render('in code `@alice` stays literal');
    expect(html).not.toContain('notion-mention');
  });

  it('does not trigger inside fenced code', () => {
    const html = build().render('```\n@alice\n```');
    expect(html).not.toContain('notion-mention');
  });

  it('returns true without pushing when silent=true', () => {
    const md = build();
    const rule = getInlineRule(md, 'notion_mention')!;
    const { state, wasPushed } = makeState('@user');
    expect(rule(state, true)).toBe(true);
    expect(wasPushed()).toBe(false);
  });

  it('returns false when the char is not @', () => {
    const md = build();
    const rule = getInlineRule(md, 'notion_mention')!;
    const { state, wasPushed } = makeState('x');
    expect(rule(state, false)).toBe(false);
    expect(wasPushed()).toBe(false);
  });

  it('returns false when preceded by a word char (mid-word @)', () => {
    const md = build();
    const rule = getInlineRule(md, 'notion_mention')!;
    const { state, wasPushed } = makeState('a@user', 1);
    expect(rule(state, false)).toBe(false);
    expect(wasPushed()).toBe(false);
  });

  it('returns false when @ is not followed by username chars', () => {
    const md = build();
    const rule = getInlineRule(md, 'notion_mention')!;
    const { state, wasPushed } = makeState('@!');
    expect(rule(state, false)).toBe(false);
    expect(wasPushed()).toBe(false);
  });
});

describe('notion slash command', () => {
  it('renders /command as a styled code span', () => {
    const html = build().render('run /deploy now');
    expect(html).toContain('<code class="notion-slash">/deploy</code>');
  });

  it('supports dashes in the command', () => {
    const html = build().render('try /kbd-like here');
    expect(html).toContain('/kbd-like');
  });

  it('does not trigger inside a word (path/like)', () => {
    const html = build().render('file path/like');
    expect(html).not.toContain('notion-slash');
  });

  it('does not trigger when / is followed by non-command chars', () => {
    const html = build().render('a /!nope');
    expect(html).not.toContain('notion-slash');
  });

  it('does not trigger inside inline code', () => {
    const html = build().render('`/command` in code');
    expect(html).not.toContain('notion-slash');
  });

  it('returns true without pushing when silent=true', () => {
    const md = build();
    const rule = getInlineRule(md, 'notion_slash')!;
    const { state, wasPushed } = makeState('/cmd');
    expect(rule(state, true)).toBe(true);
    expect(wasPushed()).toBe(false);
  });

  it('returns false when the char is not /', () => {
    const md = build();
    const rule = getInlineRule(md, 'notion_slash')!;
    const { state, wasPushed } = makeState('x');
    expect(rule(state, false)).toBe(false);
    expect(wasPushed()).toBe(false);
  });

  it('returns false when preceded by a word char (mid-word /)', () => {
    const md = build();
    const rule = getInlineRule(md, 'notion_slash')!;
    const { state, wasPushed } = makeState('a/cmd', 1);
    expect(rule(state, false)).toBe(false);
    expect(wasPushed()).toBe(false);
  });

  it('returns false when / is not followed by command chars', () => {
    const md = build();
    const rule = getInlineRule(md, 'notion_slash')!;
    const { state, wasPushed } = makeState('/!');
    expect(rule(state, false)).toBe(false);
    expect(wasPushed()).toBe(false);
  });

  it('escapes HTML in the command (defense in depth)', () => {
    const md = build();
    const rule = md.renderer.rules.notion_slash!;
    const token = { content: '<x>' };
    const out = rule(
      [token] as unknown as Parameters<typeof rule>[0],
      0,
      md.options,
      {},
      md.renderer,
    );
    expect(out).toContain('&lt;x&gt;');
  });

  it('escapes HTML in the mention (defense in depth)', () => {
    const md = build();
    const rule = md.renderer.rules.notion_mention!;
    const token = { content: '<x>' };
    const out = rule(
      [token] as unknown as Parameters<typeof rule>[0],
      0,
      md.options,
      {},
      md.renderer,
    );
    expect(out).toContain('&lt;x&gt;');
  });
});

describe('notion text rule (slash-aware terminator)', () => {
  interface TextState {
    src: string;
    pos: number;
    posMax: number;
    pending: string;
  }

  const textRule = (md: MarkdownIt) =>
    getInlineRule(md, 'text') as unknown as (state: TextState, silent: boolean) => boolean;

  it('returns false immediately when pos is already on a terminator', () => {
    const md = build();
    const state: TextState = { src: '/cmd', pos: 0, posMax: 4, pending: '' };
    expect(textRule(md)(state, false)).toBe(false);
    expect(state.pending).toBe('');
  });

  it('consumes run of plain chars and appends to pending', () => {
    const md = build();
    const state: TextState = { src: 'abc/x', pos: 0, posMax: 5, pending: '' };
    expect(textRule(md)(state, false)).toBe(true);
    expect(state.pending).toBe('abc');
    expect(state.pos).toBe(3);
  });

  it('does not touch pending in silent mode but still advances pos', () => {
    const md = build();
    const state: TextState = { src: 'abc/x', pos: 0, posMax: 5, pending: '' };
    expect(textRule(md)(state, true)).toBe(true);
    expect(state.pending).toBe('');
    expect(state.pos).toBe(3);
  });
});
