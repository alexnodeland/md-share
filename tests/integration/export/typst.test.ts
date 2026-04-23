// Integration: end-to-end Markdown → Typst through the academic markdown-it
// stack (KaTeX + pandoc cites + crossref).
//
// Complements tests/export/typst.test.ts (token-level unit tests) by running
// full markdown strings through the whole parse → render pipeline.

import katex from 'katex';
import MarkdownIt from 'markdown-it';
import mdFootnote from 'markdown-it-footnote';
import { describe, expect, it } from 'vitest';
import { markdownToTypst, markdownToTypstWithMeta } from '../../../src/export/typst.ts';
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

describe('integration: Markdown → Typst (academic flavor)', () => {
  it('emits `= Heading` for h1', () => {
    const out = markdownToTypst('# Top\n', buildAcademic());
    expect(out).toMatch(/^=\s+Top$/m);
  });

  it('emits `- item` bullets for an unordered list', () => {
    const src = '- one\n- two\n- three\n';
    const out = markdownToTypst(src, buildAcademic());
    expect(out).toMatch(/^-\s+one$/m);
    expect(out).toMatch(/^-\s+two$/m);
    expect(out).toMatch(/^-\s+three$/m);
  });

  it('emits `+ item` for an ordered list', () => {
    const src = '1. alpha\n2. beta\n';
    const out = markdownToTypst(src, buildAcademic());
    expect(out).toMatch(/^\+\s+alpha$/m);
    expect(out).toMatch(/^\+\s+beta$/m);
  });

  it('emits #table(…) for a pipe table and preserves cells', () => {
    const src = ['| A | B |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |'].join('\n');
    const out = markdownToTypst(src, buildAcademic());
    expect(out).toContain('#table(');
    expect(out).toContain('columns: 2');
    for (const cell of ['A', 'B', '1', '2', '3', '4']) expect(out).toContain(cell);
  });

  it('emits #quote(block: true)[…] for blockquotes', () => {
    const out = markdownToTypst('> soft saying\n', buildAcademic());
    expect(out).toContain('#quote(block: true)[');
    expect(out).toContain('soft saying');
  });

  it('renders inline math via $…$', () => {
    const out = markdownToTypst('Euler: $e^{i\\pi}=-1$.\n', buildAcademic());
    expect(out).toContain('$e^{i\\pi}=-1$');
  });

  it('renders pandoc cites as @key', () => {
    const out = markdownToTypst('See [@einstein1905] for details.\n', buildAcademic());
    expect(out).toContain('@einstein1905');
  });

  it('renders cross-refs to figures as Typst @labels', () => {
    const out = markdownToTypst(
      '![My figure](fig.png){#fig:plot}\n\nSee [@fig:plot] for the shape.\n',
      buildAcademic(),
    );
    // Typst uses `@label` for refs; the renderer hyphenates the colon.
    expect(out).toContain('@fig-plot');
    // The caption content should survive on the figure side.
    expect(out).toContain('My figure');
  });

  it('escapes Typst-special characters that appear in prose', () => {
    // Typst treats #, @, <, >, _, *, ~ specially; escape them in prose.
    const src = 'Prose with # and @ and < and > and _ and * and ~ needs escaping.\n';
    const out = markdownToTypst(src, buildAcademic());
    for (const sym of ['\\#', '\\@', '\\<', '\\>', '\\_', '\\*', '\\~']) {
      expect(out).toContain(sym);
    }
  });

  it('wraps bold in *…* and italic in _…_', () => {
    const out = markdownToTypst('It is **bold** and *italic*.\n', buildAcademic());
    expect(out).toContain('*bold*');
    expect(out).toContain('_italic_');
  });

  it('reports unknownTypes when a token type has no renderer', () => {
    const md = new MarkdownIt({ html: true });
    md.use(mdFootnote);
    const result = markdownToTypstWithMeta('See [^n] for details.\n\n[^n]: a note.\n', md);
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.unknownTypes.size).toBeGreaterThan(0);
  });
});
