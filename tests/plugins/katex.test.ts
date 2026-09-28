import katex from 'katex';
import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginKaTeX } from '../../src/plugins/katex.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginKaTeX(md, katex);
  return md;
};

describe('pluginKaTeX', () => {
  it('renders inline math between single $', () => {
    const html = build().render('Einstein said $E = mc^2$ famously.');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('katex-display');
  });

  it('renders display math between $$ pairs on their own lines', () => {
    const html = build().render('$$\n\\int x\\,dx\n$$');
    expect(html).toContain('katex-display');
  });

  it('renders katex-error inline with message title on invalid inline LaTeX', () => {
    const md = new MarkdownIt({ html: true });
    pluginKaTeX(md, {
      renderToString: () => {
        throw new Error('KaTeX parse error: Expected EOF');
      },
    } as unknown as typeof katex);
    const html = md.render('bad $x$ math');
    expect(html).toContain('class="katex-error"');
    expect(html).toContain('title="Expected EOF"');
    expect(html).toContain('>x</code>');
  });

  it('surfaces line number and error message on invalid block LaTeX', () => {
    const md = new MarkdownIt({ html: true });
    pluginKaTeX(md, {
      renderToString: () => {
        throw new Error('KaTeX parse error: Undefined control sequence \\foo');
      },
    } as unknown as typeof katex);
    const html = md.render('some text\n\n$$\nbadblock\n$$');
    expect(html).toContain('class="katex-error"');
    expect(html).toContain('Line 3:');
    expect(html).toContain('Undefined control sequence');
    expect(html).toContain('badblock');
  });

  it('omits the line prefix when token.map is absent', () => {
    const md = new MarkdownIt({ html: true });
    pluginKaTeX(md, {
      renderToString: () => {
        throw new Error('bad');
      },
    } as unknown as typeof katex);
    const rule = md.renderer.rules.math_block!;
    const token = { content: 'x', map: null };
    const html = rule(
      [token] as unknown as Parameters<typeof rule>[0],
      0,
      md.options,
      {},
      md.renderer,
    );
    expect(html).toContain('<strong>bad</strong>');
    expect(html).not.toContain('Line ');
  });

  it('coerces a non-Error throw value to a string', () => {
    const md = new MarkdownIt({ html: true });
    pluginKaTeX(md, {
      renderToString: () => {
        throw 'plain-string-error';
      },
    } as unknown as typeof katex);
    const html = md.render('$$\nx\n$$');
    expect(html).toContain('plain-string-error');
  });

  it('ignores a single $ without a closing match', () => {
    const html = build().render('This is $ a price tag');
    expect(html).not.toContain('katex');
  });

  it('ignores adjacent $$ as inline (requires block form)', () => {
    const html = build().render('word $$ word');
    expect(html).not.toContain('katex');
  });

  it('ignores empty inline math $$ side-by-side', () => {
    const html = build().render('empty $$ marker');
    expect(html).not.toContain('class="katex"');
  });

  it('leaves document unchanged when block math has no closing $$', () => {
    const html = build().render('$$\nunterminated');
    expect(html).not.toContain('katex-display');
  });

  it('bails on lines too short to hold $$ (single $ on its own line)', () => {
    const html = build().render('$\n\nnext para');
    expect(html).not.toContain('katex-display');
    expect(html).toContain('next para');
  });

  it('block rule returns true in silent mode when it would match', () => {
    const md = build();
    const rules = (md.block as unknown as { ruler: { __rules__: { name: string; fn: unknown }[] } })
      .ruler.__rules__;
    const mathRule = rules.find((r) => r.name === 'math_block')?.fn as
      | ((s: unknown, start: number, end: number, silent: boolean) => boolean)
      | undefined;
    expect(mathRule).toBeDefined();
    const state = {
      src: '$$\nx\n$$',
      bMarks: [0, 3, 5],
      eMarks: [2, 4, 7],
      tShift: [0, 0, 0],
    };
    expect(mathRule!(state, 0, 3, true)).toBe(true);
  });

  it('inline rule in silent mode does not push a token but still advances', () => {
    const md = build();
    const rules = (
      md.inline as unknown as { ruler: { __rules__: { name: string; fn: unknown }[] } }
    ).ruler.__rules__;
    const mathRule = rules.find((r) => r.name === 'math_inline')?.fn as
      | ((s: unknown, silent: boolean) => boolean)
      | undefined;
    expect(mathRule).toBeDefined();

    let pushed = false;
    const state = {
      src: '$x$',
      pos: 0,
      posMax: 3,
      push: () => {
        pushed = true;
        return { content: '' };
      },
    };
    const ok = mathRule!(state, true);
    expect(ok).toBe(true);
    expect(pushed).toBe(false);
  });
});

describe('pluginKaTeX — display math forms', () => {
  const count = (html: string) => html.split('<div class="katex-display" tabindex="0">').length - 1;

  it('renders $$…$$ on a single line as display math', () => {
    const html = build().render('$$E=mc^2$$');
    expect(count(html)).toBe(1);
    expect(html).not.toContain('<p>$');
  });

  it('keeps text between two single-line blocks as text', () => {
    const html = build().render('$$a+b$$\n\nsome text\n\n$$c+d$$');
    expect(count(html)).toBe(2);
    expect(html).toContain('<p>some text</p>');
  });

  it('accepts content on the opening and closing lines', () => {
    const tokens = build().parse('$$ a +\nb +\nc $$', {});
    expect(tokens[0]!.type).toBe('math_block');
    expect(tokens[0]!.content).toBe('a +\nb +\nc');
    expect(tokens[0]!.map).toEqual([0, 3]);
  });
});

describe('pluginKaTeX — inline delimiters (Pandoc rules)', () => {
  it('leaves currency amounts alone', () => {
    const html = build().render('I paid $5 for coffee and $3 for tea.');
    expect(html).not.toContain('katex');
    expect(build().render('From $20,000 to $30,000.')).not.toContain('katex');
  });

  it('renders math that follows prices in the same paragraph', () => {
    const html = build().render('Price $5 and $10, or $3.50. Area $x^2$.');
    expect(html.split('class="katex"').length - 1).toBe(1);
    expect(html).toContain('Price $5 and $10, or $3.50. Area');
  });

  it('still renders math that starts with a digit', () => {
    expect(build().render('$2^n$ and $2x$')).toContain('class="katex"');
    expect(build().render('$2^n$ and $2x$').split('class="katex"').length - 1).toBe(2);
  });

  it('requires non-space after the opening $', () => {
    expect(build().render('a $ x$ b')).not.toContain('katex');
  });

  it('skips closers preceded by space, escaped, or followed by a digit', () => {
    const tokens = build().parseInline('$a $ b\\$ c$1 d$ e', {})[0]!.children!;
    const math = tokens.find((t) => t.type === 'math_inline');
    expect(math?.content).toBe('a $ b\\$ c$1 d');
  });

  it('does not close math past the end of an enclosing link label', () => {
    expect(build().render('[$x](u) costs $5')).toContain('<a href="u">$x</a> costs $5');
  });

  it('does not treat a lone trailing $ as math', () => {
    expect(build().render('price: $')).not.toContain('katex');
  });
});
