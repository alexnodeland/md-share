import katex from 'katex';
import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { type CrossRefEnv, isRefKey, pluginCrossRef, refText } from '../../src/plugins/crossRef.ts';
import { pluginKaTeX } from '../../src/plugins/katex.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginKaTeX(md, katex);
  pluginCrossRef(md);
  return md;
};

const render = (src: string) => {
  const env: CrossRefEnv = {};
  const html = build().render(src, env);
  return { html, refs: env.crossRefs! };
};

describe('pluginCrossRef — figures', () => {
  it('turns a labelled lone image into a numbered <figure>', () => {
    const { html, refs } = render('![A *nice* plot](plot.png){#fig:plot}');
    expect(html).toBe(
      '<figure id="fig:plot" class="figure"><img src="plot.png" alt="A nice plot"><figcaption><span class="xref-label">Figure 1:</span> A <em>nice</em> plot</figcaption></figure>\n',
    );
    expect(refs.get('fig:plot')).toEqual({ kind: 'fig', number: 1 });
  });

  it('numbers figures in document order', () => {
    const { html, refs } = render('![A](a.png) {#fig:a}\n\n![B](b.png){#fig:b}');
    expect(html).toContain('Figure 2:</span> B');
    expect(refs.get('fig:b')).toEqual({ kind: 'fig', number: 2 });
  });

  it('keeps the first target when a label repeats', () => {
    const { html, refs } = render('![A](a.png){#fig:a}\n\n![B](b.png){#fig:a}');
    expect(html).toContain('Figure 2:</span> B');
    expect(refs.get('fig:a')!.number).toBe(1);
  });

  it('leaves images alone when they are not the whole paragraph or not labelled', () => {
    for (const src of [
      'See ![A](a.png){#fig:a}',
      '![A](a.png){#fig:a} and more',
      '![A](a.png)\n{#fig:a}',
      '![A](a.png){#tbl:a}',
      '![A](a.png)',
      'Plain text',
    ]) {
      expect(render(src).html).not.toContain('<figure');
    }
  });
});

describe('pluginCrossRef — tables', () => {
  const table = '| a | b |\n|---|---|\n| 1 | 2 |\n\n';

  it('moves a labelled `: caption` into the table as a numbered <caption>', () => {
    const { html, refs } = render(`${table}: Results *so far* {#tbl:r}`);
    expect(html).toContain(
      '<table id="tbl:r">\n<caption><span class="xref-label">Table 1:</span> Results <em>so far</em></caption><thead>',
    );
    expect(html).not.toContain('<p>');
    expect(refs.get('tbl:r')).toEqual({ kind: 'tbl', number: 1 });
  });

  it('captions without numbering when there is no label', () => {
    const { html } = render(`${table}Table: Just a caption`);
    expect(html).toContain('<table>\n<caption>Just a caption</caption>');
  });

  it('keeps a caption that ends in formatting', () => {
    expect(render(`${table}: A *caption*`).html).toContain('<caption>A <em>caption</em></caption>');
  });

  it('ignores paragraphs that are not captions, or not beside the table', () => {
    for (const src of [
      `${table}A normal paragraph.`,
      `${table}# Heading`,
      `${table}---\n\n# After a rule`,
      `> ${table.trim().replaceAll('\n', '\n> ')}\n\n: outside the quote`,
      table,
    ]) {
      expect(render(src).html).not.toContain('<caption>');
    }
  });
});

describe('pluginCrossRef — equations', () => {
  it('tags labelled equations with their number and id', () => {
    const { html, refs } = render('$$ a $$\n\n$$ E = mc^2 $$ {#eq:e}\n\n$$\nx\n$$ {#eq:x}');
    expect(html).toContain('<div class="katex-display" id="eq:e"');
    expect(html).toMatch(/id="eq:x"[\s\S]*x\\tag\{2\}[\s\S]*class="tag"/);
    expect(html).not.toMatch(/>a\\tag/);
    expect(refs.get('eq:e')).toEqual({ kind: 'eq', number: 1 });
    expect(refs.get('eq:x')).toEqual({ kind: 'eq', number: 2 });
  });
});

describe('refText / isRefKey', () => {
  it('reads targets the way prose names them', () => {
    expect(refText({ kind: 'fig', number: 2 })).toBe('Figure 2');
    expect(refText({ kind: 'tbl', number: 1 })).toBe('Table 1');
    expect(refText({ kind: 'eq', number: 3 })).toBe('Equation (3)');
  });

  it('recognises cross-reference keys', () => {
    expect(['fig:a', 'tbl:b', 'eq:c', 'knuth84', 'sec:x'].map(isRefKey)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});
