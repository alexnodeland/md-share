import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginAtlassianBlocks } from '../../src/plugins/atlassianBlocks.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginAtlassianBlocks(md);
  return md;
};

describe('pluginAtlassianBlocks — panels', () => {
  it.each([
    'info',
    'note',
    'warning',
    'tip',
    'error',
  ])('renders {%s} ... {%s} as a typed panel', (type) => {
    const html = build().render(`{${type}}\nbody\n{${type}}`);
    expect(html).toContain(`class="atl-panel atl-panel-${type}"`);
    expect(html).toContain('body');
    expect(html).toContain(`<div class="atl-panel-title">${type}</div>`);
  });

  it('uses the custom title from {type:title=X}', () => {
    const html = build().render('{info:title=Release Notes}\nv2\n{info}');
    expect(html).toContain('<div class="atl-panel-title">Release Notes</div>');
  });

  it('is case-insensitive for the panel type', () => {
    const html = build().render('{INFO}\nhi\n{INFO}');
    expect(html).toContain('atl-panel-info');
  });

  it('escapes HTML in the panel title', () => {
    const html = build().render('{info:title=<script>alert(1)</script>}\nx\n{info}');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('escapes HTML in the default title fallback when user provides an empty title', () => {
    const html = build().render('{info:title=}\nx\n{info}');
    expect(html).toContain('<div class="atl-panel-title">info</div>');
  });
});

describe('pluginAtlassianBlocks — expand', () => {
  it('renders {expand:title} as details+summary', () => {
    const html = build().render('{expand:Read more}\ninner\n{expand}');
    expect(html).toContain('<details class="atl-expand">');
    expect(html).toContain('<summary>Read more</summary>');
    expect(html).toContain('<div class="expand-body">');
    expect(html).toContain('inner');
  });

  it('defaults summary text when no title is provided', () => {
    const html = build().render('{expand}\nbody\n{expand}');
    expect(html).toContain('<summary>Click to expand</summary>');
  });

  it('escapes HTML in the expand summary title', () => {
    const html = build().render('{expand:<img src=x onerror=alert(1)>}\ny\n{expand}');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});

describe('pluginAtlassianBlocks — code', () => {
  it('converts {code:lang} to a fenced code block', () => {
    const html = build().render('{code:python}\ndef f(): pass\n{code}');
    expect(html).toContain('<code');
    expect(html).toContain('def f(): pass');
  });

  it('allows {code} without language', () => {
    const html = build().render('{code}\nraw\n{code}');
    expect(html).toContain('<pre>');
    expect(html).toContain('raw');
  });
});

describe('pluginAtlassianBlocks — structure', () => {
  it('leaves macros inside fenced code literal', () => {
    const html = build().render('```\n{info}\nHello\n{info}\n```');
    expect(html).not.toContain('atl-panel');
    expect(html).toContain('{info}\nHello\n{info}');
  });

  it('renders Markdown inside panels and nests other macros', () => {
    const html = build().render('{expand:More}\n{note}\n**bold**\n{note}\n{expand}');
    expect(html).toMatch(
      /<details class="atl-expand">.*<div class="atl-panel atl-panel-note">.*<strong>bold<\/strong>/s,
    );
  });

  it('supports the single-line form', () => {
    const html = build().render('{tip}Keep *it* short{tip}');
    expect(html).toContain('<div class="atl-panel atl-panel-tip">');
    expect(html).toContain('<p>Keep <em>it</em> short</p>');
  });

  it('supports single-line code macros', () => {
    expect(build().render('{code:sh}ls -la{code}')).toContain(
      '<pre><code class="language-sh">ls -la\n</code></pre>',
    );
  });

  it('reads title= among other panel parameters', () => {
    const html = build().render('{info:icon=false|title=Heads up}\nx\n{info}');
    expect(html).toContain('<div class="atl-panel-title">Heads up</div>');
  });

  it('falls back to the type when a panel has params but no title', () => {
    expect(build().render('{warning:icon=false}\nx\n{warning}')).toContain(
      '<div class="atl-panel-title">warning</div>',
    );
  });

  it('interrupts a paragraph without a blank line', () => {
    const html = build().render('Intro\n{info}\nbody\n{info}');
    expect(html).toContain('<p>Intro</p>');
    expect(html).toContain('atl-panel-info');
  });

  it('keeps unclosed macros and trailing text as literal text', () => {
    expect(build().render('{info}\nno close')).not.toContain('atl-panel');
    expect(build().render('{info}text with no closer')).not.toContain('atl-panel');
  });

  it('does not treat 4-space indented macros as blocks', () => {
    expect(build().render('    {info}\n    x\n    {info}')).toContain('<pre><code>');
  });

  it('maps tokens to their source lines', () => {
    const tokens = build().parse('a\n\n{info}\n- b\n{info}', {});
    const open = tokens.find((t) => t.type === 'atl_panel_open');
    const item = tokens.find((t) => t.type === 'list_item_open');
    expect(open?.map).toEqual([2, 5]);
    expect(item?.map?.[0]).toBe(3);
  });

  it('reports a match in silent mode without emitting tokens', () => {
    const md = build();
    const rule = (
      md.block as unknown as {
        ruler: { __rules__: { name: string; fn: (...a: unknown[]) => boolean }[] };
      }
    ).ruler.__rules__.find((r) => r.name === 'atl_macro')!.fn;
    const state = new md.block.State('{info}\nx\n{info}', md, {}, []);
    expect(rule(state, 0, 3, true)).toBe(true);
    expect(state.tokens).toHaveLength(0);
  });
});
