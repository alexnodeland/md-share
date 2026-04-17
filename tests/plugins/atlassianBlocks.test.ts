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
