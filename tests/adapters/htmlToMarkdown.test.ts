import { describe, expect, it } from 'vitest';
import { browserHtmlToMarkdown } from '../../src/adapters/htmlToMarkdown.ts';

const convert = (html: string) => browserHtmlToMarkdown.convert(html);

describe('browserHtmlToMarkdown (adapter)', () => {
  it('converts document structure to Markdown', async () => {
    const md = await convert(
      '<h2>Plan</h2><p>Read <a href="https://x.dev">the docs</a> <strong>first</strong>.</p><ul><li>one</li><li>two</li></ul>',
    );
    expect(md).toBe('## Plan\n\nRead [the docs](https://x.dev) **first**.\n\n- one\n- two');
  });

  it('unwraps the Google Docs container instead of bolding everything', async () => {
    const md = await convert(
      '<b style="font-weight:normal;" id="docs-internal-guid-abc"><p><span>Plain</span></p></b>',
    );
    expect(md).toBe('Plain');
  });

  it('turns Google Docs styled spans into emphasis, keeping spaces outside markers', async () => {
    const md = await convert(
      '<p><span style="font-weight:700">Bold </span><span style="font-style:italic">it</span> and <span style="font-weight:700;font-style:italic">both</span></p>',
    );
    expect(md).toBe('**Bold** *it* and ***both***');
  });

  it('keeps GFM tables, strikethrough, and task lists', async () => {
    const md = await convert(
      '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><p><del>old</del></p>',
    );
    expect(md).toContain('| A |');
    expect(md).toContain('~~old~~');
  });

  it('numbers ordered lists from their start and indents nested lists', async () => {
    const md = await convert('<ol start="3"><li>c<ul><li>nested</li></ul></li><li>d</li></ol>');
    expect(md).toBe('3. c\n   - nested\n4. d');
  });

  it('keeps multi-paragraph table cells on one row', async () => {
    const md = await convert(
      '<table><thead><tr><th><p>A</p></th></tr></thead><tbody><tr><td><p>one</p><p>two</p></td></tr></tbody></table>',
    );
    expect(md).toBe('| A |\n| --- |\n| one two |');
  });

  it('fences <pre> blocks that have no inner <code>', async () => {
    expect(await convert('<pre>a < b\nc</pre>')).toBe('```\na < b\nc\n```');
  });

  it('drops scripts and styles', async () => {
    expect(await convert('<style>p{}</style><script>x()</script><p>ok</p>')).toBe('ok');
  });
});
