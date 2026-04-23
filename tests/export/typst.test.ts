import katex from 'katex';
import MarkdownIt from 'markdown-it';
import mdFootnote from 'markdown-it-footnote';
import { describe, expect, it } from 'vitest';
import { escapeTypst, markdownToTypst, markdownToTypstWithMeta } from '../../src/export/typst.ts';
import { pluginCrossRef } from '../../src/plugins/crossRef.ts';
import { pluginKaTeX } from '../../src/plugins/katex.ts';
import { pluginPandocCite } from '../../src/plugins/pandocCite.ts';

const build = (): MarkdownIt => {
  const md = new MarkdownIt({ html: true });
  pluginKaTeX(md, katex);
  pluginPandocCite(md);
  pluginCrossRef(md);
  return md;
};

describe('escapeTypst', () => {
  it('escapes every Typst special character', () => {
    const s = '# @ ` < > $ * _ ~ " [ ] \\';
    const out = escapeTypst(s);
    expect(out).toBe('\\# \\@ \\` \\< \\> \\$ \\* \\_ \\~ \\" \\[ \\] \\\\');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeTypst('Hello, world!')).toBe('Hello, world!');
  });

  it('handles empty string', () => {
    expect(escapeTypst('')).toBe('');
  });
});

describe('markdownToTypst — document shell', () => {
  it('emits the preamble', () => {
    const out = markdownToTypst('Hello.', build());
    expect(out).toContain('#set page');
    expect(out).toContain('#set text');
  });

  it('handles empty input gracefully', () => {
    const out = markdownToTypst('', build());
    expect(out).toContain('#set page');
  });

  it('emits a line for a `---` horizontal rule', () => {
    const out = markdownToTypst('---', build());
    expect(out).toContain('#line(length: 100%)');
  });
});

describe('markdownToTypst — headings', () => {
  it('maps h1–h4 to = / == / === / ====', () => {
    const src = '# One\n\n## Two\n\n### Three\n\n#### Four\n';
    const out = markdownToTypst(src, build());
    expect(out).toContain('= One');
    expect(out).toContain('== Two');
    expect(out).toContain('=== Three');
    expect(out).toContain('==== Four');
  });

  it('falls back to ==== for h5/h6', () => {
    const src = '##### Five\n\n###### Six\n';
    const out = markdownToTypst(src, build());
    expect(out).toMatch(/==== Five/);
    expect(out).toMatch(/==== Six/);
  });
});

describe('markdownToTypst — inline formatting', () => {
  it('renders strong, emphasis, inline code, and links', () => {
    const out = markdownToTypst('A *b* and **c** then `d` and [e](https://x.com).', build());
    expect(out).toContain('_b_');
    expect(out).toContain('*c*');
    expect(out).toContain('#raw("d")');
    expect(out).toContain('#link("https://x.com")[e]');
  });

  it('renders hard breaks with backslash-newline', () => {
    const out = markdownToTypst('a  \nb', build());
    expect(out).toContain('a \\\nb');
  });

  it('collapses soft breaks to a single space', () => {
    const out = markdownToTypst('one\ntwo', build());
    expect(out).toContain('one two');
  });

  it('escapes Typst specials in text', () => {
    const out = markdownToTypst('hash# at@ tick` gt> dollar$', build());
    expect(out).toContain('hash\\#');
    expect(out).toContain('at\\@');
    expect(out).toContain('tick\\`');
    expect(out).toContain('gt\\>');
    expect(out).toContain('dollar\\$');
  });

  it('escapeTypst directly handles < and [ ]', () => {
    // these chars rarely survive markdown-it parsing as plain text, so verify the
    // escape fn alone — the escape is still load-bearing when plugins inject
    // fragments into text nodes.
    expect(escapeTypst('<tag>')).toBe('\\<tag\\>');
    expect(escapeTypst('[brk]')).toBe('\\[brk\\]');
  });

  it('escapes backslash so shell-like strings survive as literal text', () => {
    const hostile = '\\immediate\\write18{rm -rf /}';
    const out = markdownToTypst(hostile, build());
    expect(out).toContain('\\\\immediate\\\\write18');
  });
});

describe('markdownToTypst — lists', () => {
  it('renders unordered lists with `-`', () => {
    const out = markdownToTypst('- a\n- b\n', build());
    expect(out).toContain('- a');
    expect(out).toContain('- b');
  });

  it('renders ordered lists with `+`', () => {
    const out = markdownToTypst('1. one\n2. two\n', build());
    expect(out).toContain('+ one');
    expect(out).toContain('+ two');
  });

  it('indents nested lists with two spaces', () => {
    const out = markdownToTypst('- a\n  - inner\n', build());
    expect(out).toContain('- a');
    expect(out).toContain('  - inner');
  });
});

describe('markdownToTypst — code blocks', () => {
  it('fences preserve the language', () => {
    const out = markdownToTypst('```js\nconst x = 1;\n```', build());
    expect(out).toContain('```js\nconst x = 1;\n```');
  });

  it('handles fences without a language', () => {
    const out = markdownToTypst('```\nplain\n```', build());
    expect(out).toContain('```\nplain\n```');
  });

  it('handles indented code blocks', () => {
    const out = markdownToTypst('    four spaces\n', build());
    expect(out).toContain('```');
    expect(out).toContain('four spaces');
  });
});

describe('markdownToTypst — math', () => {
  it('inline math goes in $…$', () => {
    const out = markdownToTypst('Inline $a=b$ math.', build());
    expect(out).toContain('$a=b$');
  });

  it('block math goes in $ … $', () => {
    const out = markdownToTypst('$$\nx^2 + y^2 = z^2\n$$', build());
    expect(out).toContain('$ x^2 + y^2 = z^2 $');
  });
});

describe('markdownToTypst — blockquotes and rules', () => {
  it('wraps blockquotes in #quote', () => {
    const out = markdownToTypst('> hello\n', build());
    expect(out).toContain('#quote(block: true)[');
    expect(out).toContain('hello');
  });
});

describe('markdownToTypst — tables', () => {
  it('emits #table with column count and bold headers', () => {
    const out = markdownToTypst('| A | B |\n|---|---|\n| 1 | 2 |\n', build());
    expect(out).toContain('#table(');
    expect(out).toContain('columns: 2');
    expect(out).toContain('[*A*]');
    expect(out).toContain('[*B*]');
    expect(out).toContain('[1]');
    expect(out).toContain('[2]');
  });
});

describe('markdownToTypst — images', () => {
  it('renders images as #figure(image(...), caption: …)', () => {
    const out = markdownToTypst('![my alt](picture.png)', build());
    expect(out).toContain('#figure(image("picture.png"), caption: [my alt])');
  });
});

describe('markdownToTypst — academic features', () => {
  it('renders pandoc citations as @key', () => {
    const out = markdownToTypst('See [@smith2020] for detail.', build());
    expect(out).toContain('@smith2020');
  });

  it('renders resolved cross-refs as @fig-name style labels', () => {
    const src = 'Label here {#fig:foo}.\n\nSee [@fig:foo].\n';
    const out = markdownToTypst(src, build());
    expect(out).toContain('@fig-foo');
  });

  it('renders unresolved cross-refs with ? markers', () => {
    const out = markdownToTypst('See [@fig:missing].\n', build());
    expect(out).toContain('Figure ?missing?');
  });

  it('covers table and equation cross-ref kinds', () => {
    const src = 'T {#tbl:a}.\n\nE {#eq:b}.\n\nSee [@tbl:a] and [@eq:b].\n';
    const out = markdownToTypst(src, build());
    expect(out).toContain('@tbl-a');
    expect(out).toContain('@eq-b');
  });
});

describe('markdownToTypst — miscellaneous', () => {
  it('drops raw HTML blocks and inline HTML safely', () => {
    const out = markdownToTypst('<div>ignored</div>\n', build());
    expect(out).not.toContain('<div>');
  });

  it('drops footnote blocks without throwing', () => {
    const md = new MarkdownIt({ html: true });
    md.use(mdFootnote);
    const src = 'Text[^1].\n\n[^1]: note body.\n';
    const out = markdownToTypst(src, md);
    expect(out).toContain('Text');
  });

  it('reports unknown token types', () => {
    const md = new MarkdownIt({ html: true });
    md.core.ruler.push('inject_unknown', (state) => {
      const Tok = state.Token;
      state.tokens.push(new Tok('mystery_thing', '', 0));
      const inlineWithText = new Tok('inline', '', 0);
      inlineWithText.content = 'stray';
      const textChild = new Tok('text', '', 0);
      textChild.content = 'stray';
      inlineWithText.children = [textChild, new Tok('mystery_inline', '', 0)];
      state.tokens.push(inlineWithText);
      // an inline whose only child is html_inline → renders to empty string
      const inlineEmpty = new Tok('inline', '', 0);
      inlineEmpty.content = '';
      const htmlChild = new Tok('html_inline', '', 0);
      htmlChild.content = '<x>';
      inlineEmpty.children = [htmlChild];
      state.tokens.push(inlineEmpty);
    });
    const result = markdownToTypstWithMeta('Hello', md);
    expect(result.content).toContain('stray');
    expect(result.content).not.toContain('<x>');
    expect(result.unknownTypes.has('mystery_thing')).toBe(true);
    expect(result.unknownTypes.has('mystery_inline')).toBe(true);
  });
});
