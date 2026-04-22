// Integration: end-to-end Markdown → LaTeX through the academic markdown-it
// stack (KaTeX + pandoc cites + crossref).
//
// Unit tests in tests/export/latex.test.ts exercise escape logic and
// individual token types. These tests feed full markdown strings through the
// whole parse → render pipeline, so a drift in plugin composition — or in
// markdown-it's own token shape — surfaces here rather than downstream.

import katex from 'katex';
import MarkdownIt from 'markdown-it';
import mdFootnote from 'markdown-it-footnote';
import { describe, expect, it } from 'vitest';
import { markdownToLatex, markdownToLatexWithMeta } from '../../../src/export/latex.ts';
import { pluginCrossRef } from '../../../src/plugins/crossRef.ts';
import { pluginKaTeX } from '../../../src/plugins/katex.ts';
import { pluginPandocCite } from '../../../src/plugins/pandocCite.ts';

const buildAcademic = (): MarkdownIt => {
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
  pluginKaTeX(md, katex);
  pluginPandocCite(md);
  pluginCrossRef(md);
  return md;
};

describe('integration: Markdown → LaTeX (academic flavor)', () => {
  it('emits itemize for a bullet list', () => {
    const src = '- one\n- two\n- three\n';
    const out = markdownToLatex(src, buildAcademic());
    expect(out).toContain('\\begin{itemize}');
    expect(out).toContain('\\item one');
    expect(out).toContain('\\item two');
    expect(out).toContain('\\item three');
    expect(out).toContain('\\end{itemize}');
  });

  it('emits enumerate for an ordered list', () => {
    const src = '1. alpha\n2. beta\n';
    const out = markdownToLatex(src, buildAcademic());
    expect(out).toContain('\\begin{enumerate}');
    expect(out).toContain('\\item alpha');
    expect(out).toContain('\\item beta');
    expect(out).toContain('\\end{enumerate}');
  });

  it('emits tabular for a pipe table with header', () => {
    const src = ['| A | B |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |'].join('\n');
    const out = markdownToLatex(src, buildAcademic());
    expect(out).toContain('\\begin{tabular}');
    expect(out).toContain('\\toprule');
    expect(out).toContain('\\end{tabular}');
    // Every cell value present.
    for (const cell of ['A', 'B', '1', '2', '3', '4']) expect(out).toContain(cell);
  });

  it('emits quote for a blockquote', () => {
    const src = '> a wise saying\n';
    const out = markdownToLatex(src, buildAcademic());
    expect(out).toContain('\\begin{quote}');
    expect(out).toContain('a wise saying');
    expect(out).toContain('\\end{quote}');
  });

  it('renders inline math via $…$', () => {
    const src = 'Euler: $e^{i\\pi}+1=0$ is famous.\n';
    const out = markdownToLatex(src, buildAcademic());
    expect(out).toContain('$e^{i\\pi}+1=0$');
  });

  it('renders pandoc-style citations as \\cite{…}', () => {
    const src = 'See [@einstein1905] for details.\n';
    const out = markdownToLatex(src, buildAcademic());
    expect(out).toContain('\\cite{einstein1905}');
  });

  it('renders cross-refs to figures as \\ref{fig:…}', () => {
    const src = '![My figure](fig.png){#fig:plot}\n\nSee [@fig:plot] for the shape.\n';
    const out = markdownToLatex(src, buildAcademic());
    expect(out).toContain('\\ref{fig:plot}');
    expect(out).toContain('Figure~');
  });

  it('escapes LaTeX-special characters that appear in prose', () => {
    // These are problematic characters inside text. Not inside math, not
    // inside fenced code.
    const src = 'Prose with & and % and # and _ and $ need escaping.\n';
    const out = markdownToLatex(src, buildAcademic());
    expect(out).toContain('\\&');
    expect(out).toContain('\\%');
    expect(out).toContain('\\#');
    expect(out).toContain('\\_');
    expect(out).toContain('\\$');
    // But not double-escaped.
    expect(out).not.toContain('\\\\&');
  });

  it('preserves bold and italic as textbf / emph', () => {
    const src = 'It is **bold** and *italic* prose.\n';
    const out = markdownToLatex(src, buildAcademic());
    expect(out).toContain('\\textbf{bold}');
    expect(out).toContain('\\emph{italic}');
  });

  it('reports unknownTypes when a token type has no renderer', () => {
    // Footnote tokens aren't in the latex renderer's case list — they fall
    // into the unknown bucket. This is the behavior we want to verify:
    // the pipeline doesn't throw, it just records the gap for follow-up.
    const md = new MarkdownIt({ html: true });
    md.use(mdFootnote);
    const src = 'See [^n] for details.\n\n[^n]: a note.\n';
    const result = markdownToLatexWithMeta(src, md);
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.unknownTypes.size).toBeGreaterThan(0);
  });
});
