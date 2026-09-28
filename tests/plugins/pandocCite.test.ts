import katex from 'katex';
import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import { describe, expect, it } from 'vitest';
import { pluginCrossRef } from '../../src/plugins/crossRef.ts';
import { pluginKaTeX } from '../../src/plugins/katex.ts';
import {
  type BibliographyMeta,
  type CitationMeta,
  pluginPandocCite,
} from '../../src/plugins/pandocCite.ts';

const build = (crossRefs = true) => {
  const md = new MarkdownIt({ html: true, linkify: true });
  pluginKaTeX(md, katex);
  if (crossRefs) pluginCrossRef(md);
  pluginPandocCite(md);
  return md;
};

const BIB = `\`\`\`bibliography
@book{knuth84, author = {Donald E. Knuth}, title = {The TeXbook}, year = 1984}
@article{lamport94, author = {Lamport, Leslie and Gödel, Kurt}, title = {Proofs}, journal = {Monthly}, year = 1994}
@misc{uncited, title = {Never cited}}
\`\`\``;

const render = (text: string, md = build()) => md.render(`${text}\n\n${BIB}`);
const citations = (text: string): Token[] =>
  build()
    .parse(`${text}\n\n${BIB}`, {})
    .flatMap((t) => t.children ?? [])
    .filter((t) => t.type === 'citation');

describe('pluginPandocCite — citations', () => {
  it('numbers bracketed citations by first use and links them to the list', () => {
    const html = render('First [@lamport94], then [@knuth84], again [@lamport94].');
    expect(html).toContain(
      'First <span class="citation">[<a href="#ref-lamport94">1</a>]</span>, then <span class="citation">[<a href="#ref-knuth84">2</a>]</span>, again <span class="citation">[<a href="#ref-lamport94">1</a>]</span>.',
    );
  });

  it('keeps prefixes, locators, and several sources in one bracket', () => {
    expect(render('[see @knuth84, p. 12; also @lamport94 ch. 2; -@knuth84]')).toContain(
      '<span class="citation">[see <a href="#ref-knuth84">1</a>, p. 12, also <a href="#ref-lamport94">2</a>, ch. 2, <a href="#ref-knuth84">1</a>]</span>',
    );
  });

  it('names the authors of a narrative citation', () => {
    expect(render('As @lamport94 argued.')).toContain(
      'As Lamport and Gödel <span class="citation">[<a href="#ref-lamport94">1</a>]</span> argued.',
    );
  });

  it('leaves unknown narrative @names as text but flags unknown bracketed keys', () => {
    const html = render('Ping @someone about [@nope].');
    expect(html).toContain('Ping @someone about');
    expect(html).toContain(
      '<span class="citation">[<span class="citation-missing" title="No source nope in the bibliography">@nope?</span>]</span>',
    );
  });

  it('is not fooled by emails, links, footnote-like brackets, or code', () => {
    const html = render(
      'Mail me@x.org, [@knuth84](https://x.org), [x @knuth84 y](https://x.org), [a [@knuth84] b](https://x.org), [@knuth84][r], [x@knuth84], [@], `[@knuth84]`\n\n[r]: https://r.org',
    );
    expect(html).not.toContain('class="citation"');
  });

  it('leaves a citation inside link text as text, keeping the link', () => {
    expect(build().render('[a [@k] b](https://x.org)')).toBe(
      '<p><a href="https://x.org">a [@k] b</a></p>\n',
    );
  });

  it('reads an unclosed bracket as a narrative citation', () => {
    expect(render('[see @knuth84')).toContain('[see Knuth <span class="citation">');
  });

  it('records plain text on the token for exporters', () => {
    expect(
      citations('[see @knuth84, p. 3] @lamport94 @fig:none [@eq:none] @anyone').map(
        (t) => t.content,
      ),
    ).toEqual(['[see 1, p. 3]', 'Lamport and Gödel [2]', '@fig:none?', '[@eq:none?]', '@anyone']);
    const meta = citations('[@knuth84]')[0]!.meta as CitationMeta;
    expect(meta.resolved![0]).toMatchObject({ kind: 'source', number: 1, key: 'knuth84' });
  });
});

describe('pluginPandocCite — cross-references', () => {
  const doc = '![Plot](p.png){#fig:p}\n\n$$ x $$ {#eq:x}\n\n';

  it('renders labelled targets by name, bracketed or not', () => {
    const html = render(`${doc}See @fig:p and [@eq:x; @fig:p].`);
    expect(html).toContain(
      'See <a class="xref" href="#fig:p">Figure 1</a> and <a class="xref" href="#eq:x">Equation (1)</a>, <a class="xref" href="#fig:p">Figure 1</a>.',
    );
  });

  it('brackets a mix of references and citations', () => {
    expect(render(`${doc}[@fig:p; @knuth84]`)).toContain(
      '<span class="citation">[<a class="xref" href="#fig:p">Figure 1</a>, <a href="#ref-knuth84">1</a>]</span>',
    );
  });

  it('flags references to labels that do not exist, even narrative ones', () => {
    expect(render('@fig:gone')).toContain(
      '<span class="citation-missing" title="Nothing in this document is labelled fig:gone">@fig:gone?</span>',
    );
  });

  it('treats every reference as missing without the cross-ref plugin', () => {
    expect(render(`${doc}@fig:p`, build(false))).toContain('@fig:p?');
  });
});

describe('pluginPandocCite — bibliography', () => {
  it('lists cited sources first, then uncited ones, as an ordered list', () => {
    const html = render('[@lamport94]');
    expect(html).toContain(
      '<ol class="references">\n<li id="ref-lamport94" value="1">Leslie Lamport and Kurt Gödel. 1994. “Proofs.” <em>Monthly</em>.</li>\n<li id="ref-knuth84" value="2">Donald E. Knuth. 1984. <em>The TeXbook.</em></li>\n<li id="ref-uncited" value="3"><em>Never cited.</em></li>\n</ol>',
    );
    expect(html).not.toContain('<pre');
  });

  it('links DOIs and URLs in a new tab', () => {
    const html = build().render(
      '```bibliography\n@misc{w, title = {W}, url = {https://w.org/?a=1&b=2}}\n```',
    );
    expect(html).toContain(
      '<a href="https://w.org/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">https://w.org/?a=1&amp;b=2</a>',
    );
  });

  it('merges several blocks into one list, shown at the first', () => {
    const md = build();
    const html = md.render(
      '[@b]\n\n```bibliography\n@misc{a, title = {A}}\n```\n\n```bibliography\n@misc{b, title = {B}}\n@misc{a, title = {Dup}}\n```',
    );
    expect(html.match(/<li /g)).toHaveLength(2);
    expect(html).toContain('<li id="ref-b" value="1">');
    expect(html).not.toContain('Dup');
    const lists = md
      .parse('```bibliography\n```\n\n```bibliography\n@misc{a, title = {A}}\n```', {})
      .filter((t) => t.type === 'bibliography')
      .map((t) => t.meta as BibliographyMeta);
    expect(lists.map((l) => [l.first, l.items.length])).toEqual([
      [true, 1],
      [false, 0],
    ]);
  });

  it('says so when a block holds no entries', () => {
    expect(build().render('```bibliography\nnot bibtex\n```')).toBe(
      '<p class="bibliography-empty">Bibliography: no BibTeX entries found in this block.</p>\n',
    );
  });

  it('leaves other fences, including bibtex ones, as code', () => {
    const html = build().render('```bibtex\n@misc{a, title = {A}}\n```\n\n```\nplain\n```');
    expect(html).not.toContain('references');
    expect(html.match(/<pre>/g)).toHaveLength(2);
  });
});
