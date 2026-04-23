import katex from 'katex';
import MarkdownIt from 'markdown-it';
import mdFootnote from 'markdown-it-footnote';
import { describe, expect, it } from 'vitest';
import { escapeLatex, markdownToLatex, markdownToLatexWithMeta } from '../../src/export/latex.ts';
import { pluginCrossRef } from '../../src/plugins/crossRef.ts';
import { pluginKaTeX } from '../../src/plugins/katex.ts';
import { pluginPandocCite } from '../../src/plugins/pandocCite.ts';

const build = (opts?: { academic?: boolean }): MarkdownIt => {
  const md = new MarkdownIt({ html: true });
  if (opts?.academic ?? true) {
    pluginKaTeX(md, katex);
    pluginPandocCite(md);
    pluginCrossRef(md);
  }
  return md;
};

describe('escapeLatex', () => {
  it('escapes every LaTeX special character', () => {
    const s = '\\ & % $ # _ { } ~ ^';
    const out = escapeLatex(s);
    expect(out).toBe(
      '\\textbackslash{} \\& \\% \\$ \\# \\_ \\{ \\} \\textasciitilde{} \\textasciicircum{}',
    );
  });

  it('leaves ordinary text alone', () => {
    expect(escapeLatex('Hello, world!')).toBe('Hello, world!');
  });

  it('handles empty string', () => {
    expect(escapeLatex('')).toBe('');
  });
});

describe('markdownToLatex — document shell', () => {
  it('wraps output in documentclass / begin document / end document', () => {
    const out = markdownToLatex('Hello.', build());
    expect(out).toContain('\\documentclass{article}');
    expect(out).toContain('\\begin{document}');
    expect(out).toContain('\\end{document}');
  });

  it('emits a minimal but valid shell for empty input', () => {
    const out = markdownToLatex('', build());
    expect(out).toContain('\\begin{document}');
    expect(out).toContain('\\end{document}');
  });

  it('treats a sole `---` line as a horizontal rule', () => {
    const out = markdownToLatex('---', build());
    expect(out).toContain('\\hrulefill');
  });
});

describe('markdownToLatex — headings', () => {
  it('maps h1–h4 to section commands', () => {
    const src = '# One\n\n## Two\n\n### Three\n\n#### Four\n';
    const out = markdownToLatex(src, build());
    expect(out).toContain('\\section{One}');
    expect(out).toContain('\\subsection{Two}');
    expect(out).toContain('\\subsubsection{Three}');
    expect(out).toContain('\\paragraph{Four}');
  });

  it('falls back to bold for h5/h6', () => {
    const src = '##### Five\n\n###### Six\n';
    const out = markdownToLatex(src, build());
    expect(out).toContain('\\textbf{Five}');
    expect(out).toContain('\\textbf{Six}');
  });
});

describe('markdownToLatex — inline formatting', () => {
  it('renders emphasis, strong, code, and links', () => {
    const out = markdownToLatex('A *b* and **c** then `d` and [e](https://x.com).', build());
    expect(out).toContain('\\emph{b}');
    expect(out).toContain('\\textbf{c}');
    expect(out).toContain('\\texttt{d}');
    expect(out).toContain('\\href{https://x.com}{e}');
  });

  it('preserves soft and hard line breaks', () => {
    const out = markdownToLatex('soft\nbreak and hard  \nbreak', build());
    expect(out).toContain('soft\nbreak and hard\\\\\nbreak');
  });

  it('escapes LaTeX specials in text', () => {
    const out = markdownToLatex(
      '100% off & nothing more. Price: $5. #hash _underscore_ {braces}.',
      build(),
    );
    expect(out).toContain('100\\% off \\& nothing more');
    expect(out).toContain('\\$5');
    expect(out).toContain('\\#hash');
    expect(out).toContain('\\{braces\\}');
  });

  it('escapes backslash in text so shell-escape cannot fire', () => {
    const hostile = '\\immediate\\write18{rm -rf /}';
    const out = markdownToLatex(hostile, build());
    expect(out).toContain('\\textbackslash{}immediate\\textbackslash{}write18');
    expect(out).not.toMatch(/^\\immediate\\write18/m);
  });

  it('escapes tilde and caret', () => {
    const out = markdownToLatex('x ~y ^z', build());
    expect(out).toContain('\\textasciitilde{}y');
    expect(out).toContain('\\textasciicircum{}z');
  });
});

describe('markdownToLatex — lists', () => {
  it('renders unordered lists with itemize', () => {
    const out = markdownToLatex('- a\n- b\n', build());
    expect(out).toContain('\\begin{itemize}');
    expect(out).toContain('\\item a');
    expect(out).toContain('\\item b');
    expect(out).toContain('\\end{itemize}');
  });

  it('renders ordered lists with enumerate', () => {
    const out = markdownToLatex('1. one\n2. two\n', build());
    expect(out).toContain('\\begin{enumerate}');
    expect(out).toContain('\\item one');
    expect(out).toContain('\\end{enumerate}');
  });

  it('renders nested lists', () => {
    const out = markdownToLatex('- a\n  - inner\n', build());
    expect(out.match(/\\begin\{itemize\}/g)?.length).toBe(2);
    expect(out).toContain('\\item inner');
  });
});

describe('markdownToLatex — code blocks', () => {
  it('emits verbatim for fenced code with language', () => {
    const out = markdownToLatex('```js\nconst x = 1;\n```', build());
    expect(out).toContain('\\begin{verbatim}[language=js]');
    expect(out).toContain('const x = 1;');
    expect(out).toContain('\\end{verbatim}');
  });

  it('omits language label for unspecified language', () => {
    const out = markdownToLatex('```\nplain\n```', build());
    expect(out).toContain('\\begin{verbatim}\nplain');
  });

  it('strips pipes from verbatim content', () => {
    const out = markdownToLatex('```\na|b\n```', build());
    expect(out).toContain('ab');
    expect(out).not.toContain('a|b');
  });

  it('handles indented code blocks', () => {
    const out = markdownToLatex('    indented\n    code\n', build());
    expect(out).toContain('\\begin{verbatim}');
    expect(out).toContain('indented');
  });
});

describe('markdownToLatex — math', () => {
  it('passes inline math through inside $…$', () => {
    const out = markdownToLatex('Inline $a=b$ math.', build());
    expect(out).toContain('$a=b$');
  });

  it('renders block math with \\[ … \\]', () => {
    const out = markdownToLatex('$$\nx^2 + y^2 = z^2\n$$', build());
    expect(out).toContain('\\[\nx^2 + y^2 = z^2\n\\]');
  });
});

describe('markdownToLatex — blockquotes and rules', () => {
  it('wraps blockquotes in quote environment', () => {
    const out = markdownToLatex('> a quote\n', build());
    expect(out).toContain('\\begin{quote}');
    expect(out).toContain('a quote');
    expect(out).toContain('\\end{quote}');
  });

  it('emits hrulefill for horizontal rules', () => {
    const out = markdownToLatex('before\n\n---\n\nafter\n', build());
    expect(out).toContain('\\hrulefill');
  });
});

describe('markdownToLatex — tables', () => {
  it('renders a GFM table as tabular with booktabs rules', () => {
    const out = markdownToLatex('| A | B |\n|---|---|\n| 1 | 2 |\n', build());
    expect(out).toContain('\\begin{tabular}{ll}');
    expect(out).toContain('\\toprule');
    expect(out).toContain('\\textbf{A}');
    expect(out).toContain('\\textbf{B}');
    expect(out).toContain('\\midrule');
    expect(out).toContain('1 & 2');
    expect(out).toContain('\\bottomrule');
    expect(out).toContain('\\end{tabular}');
  });
});

describe('markdownToLatex — images', () => {
  it('renders images as figure with caption from alt', () => {
    const out = markdownToLatex('![my alt](picture.png)', build());
    expect(out).toContain('\\begin{figure}');
    expect(out).toContain('\\includegraphics[width=0.8\\linewidth]{picture.png}');
    expect(out).toContain('\\caption{my alt}');
    expect(out).toContain('\\end{figure}');
  });
});

describe('markdownToLatex — academic features', () => {
  it('renders pandoc citations as \\cite{key}', () => {
    const out = markdownToLatex('See [@smith2020] for detail.', build());
    expect(out).toContain('\\cite{smith2020}');
  });

  it('renders resolved cross-refs as Figure~\\ref{fig:foo}', () => {
    const src = 'Label here {#fig:foo}.\n\nSee [@fig:foo].\n';
    const out = markdownToLatex(src, build());
    expect(out).toContain('Figure~\\ref{fig:foo}');
  });

  it('renders unresolved cross-refs with ? markers', () => {
    const src = 'See [@fig:missing].\n';
    const out = markdownToLatex(src, build());
    expect(out).toContain('Figure~?missing?');
  });

  it('covers table and equation cross-ref kinds', () => {
    const src = 'T {#tbl:a}.\n\nE {#eq:b}.\n\nSee [@tbl:a] and [@eq:b].\n';
    const out = markdownToLatex(src, build());
    expect(out).toContain('Table~\\ref{tbl:a}');
    expect(out).toContain('Equation~\\ref{eq:b}');
  });
});

describe('markdownToLatex — miscellaneous', () => {
  it('drops HTML blocks and html_inline safely', () => {
    const out = markdownToLatex('<div>ignored</div>\n', build());
    expect(out).not.toContain('<div>');
  });

  it('drops footnote blocks without throwing', () => {
    const md = new MarkdownIt({ html: true });
    md.use(mdFootnote);
    const src = 'Text[^1].\n\n[^1]: note body.\n';
    const out = markdownToLatex(src, md);
    expect(out).toContain('Text');
    expect(out).toContain('\\end{document}');
  });

  it('reports unknown token types without throwing', () => {
    const md = new MarkdownIt({ html: true });
    md.core.ruler.push('inject_unknown', (state) => {
      const Token = state.Token;
      state.tokens.push(new Token('mystery_thing', '', 0));
      // bare inline with real text → exercises the non-empty path
      const inlineWithText = new Token('inline', '', 0);
      inlineWithText.content = 'stray';
      const textChild = new Token('text', '', 0);
      textChild.content = 'stray';
      inlineWithText.children = [textChild, new Token('mystery_inline', '', 0)];
      state.tokens.push(inlineWithText);
      // bare inline whose only child is an html_inline → renders to empty string
      const inlineEmpty = new Token('inline', '', 0);
      inlineEmpty.content = '';
      const htmlChild = new Token('html_inline', '', 0);
      htmlChild.content = '<x>';
      inlineEmpty.children = [htmlChild];
      state.tokens.push(inlineEmpty);
    });
    const result = markdownToLatexWithMeta('Hello', md);
    expect(result.content).toContain('stray');
    expect(result.content).not.toContain('<x>');
    expect(result.unknownTypes.has('mystery_thing')).toBe(true);
    expect(result.unknownTypes.has('mystery_inline')).toBe(true);
  });
});
