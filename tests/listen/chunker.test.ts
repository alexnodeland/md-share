import { beforeEach, describe, expect, it } from 'vitest';
import { extractSpeakableChunks } from '../../src/listen/chunker.ts';

const makeRoot = (html: string): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
};

describe('extractSpeakableChunks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns an empty array for an empty root', () => {
    expect(extractSpeakableChunks(makeRoot(''))).toEqual([]);
  });

  it('emits h1 without the "Section:" prefix', () => {
    const chunks = extractSpeakableChunks(makeRoot('<h1>Top</h1>'));
    expect(chunks).toEqual([{ text: 'Top.', el: expect.any(HTMLElement) }]);
  });

  it('emits h2-h6 with the "Section:" prefix', () => {
    const chunks = extractSpeakableChunks(makeRoot('<h2>Two</h2><h6>Six</h6>'));
    expect(chunks.map((c) => c.text)).toEqual(['Section: Two.', 'Section: Six.']);
  });

  it('skips the TOC container entirely', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<div class="toc-container"><p>ignore me</p></div><p>real text</p>'),
    );
    expect(chunks.map((c) => c.text)).toEqual(['real text']);
  });

  it('describes mermaid containers without reading the source', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<div class="mermaid-container">graph TD</div>'),
    );
    expect(chunks[0]!.text).toBe('A diagram is shown here.');
  });

  it('describes katex-display equations without reading LaTeX', () => {
    const chunks = extractSpeakableChunks(makeRoot('<div class="katex-display">x^2</div>'));
    expect(chunks[0]!.text).toBe('A mathematical equation is displayed.');
  });

  it('announces code blocks with language when present', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<pre><code class="language-rust">fn f() {}</code></pre>'),
    );
    expect(chunks[0]!.text).toBe('A code block in rust.');
  });

  it('announces code blocks without a language class', () => {
    const chunks = extractSpeakableChunks(makeRoot('<pre><code>plain</code></pre>'));
    expect(chunks[0]!.text).toBe('A code block is shown.');
  });

  it('reads tables row-by-row with column pairs', () => {
    const chunks = extractSpeakableChunks(
      makeRoot(
        '<table><thead><tr><th>Name</th><th>Status</th></tr></thead><tbody><tr><td>Alice</td><td>Done</td></tr></tbody></table>',
      ),
    );
    expect(chunks.map((c) => c.text)).toEqual([
      'A table with columns: Name, Status.',
      'Row 1. Name: Alice. Status: Done.',
    ]);
  });

  it('degrades to "A table is shown." when headers or rows are missing', () => {
    const chunks = extractSpeakableChunks(makeRoot('<table><tbody></tbody></table>'));
    expect(chunks[0]!.text).toBe('A table is shown.');
  });

  it('emits row cells without a header pair when a header is missing', () => {
    const chunks = extractSpeakableChunks(
      makeRoot(
        '<table><thead><tr><th>H1</th></tr></thead><tbody><tr><td>A</td><td>B</td></tr></tbody></table>',
      ),
    );
    expect(chunks[1]!.text).toBe('Row 1. H1: A. B.');
  });

  it('renders callouts as "Title: body"', () => {
    const chunks = extractSpeakableChunks(
      makeRoot(
        '<div class="callout callout-tip"><div class="callout-title">Tip</div><div class="callout-body">Use keyboard shortcuts</div></div>',
      ),
    );
    expect(chunks[0]!.text).toBe('Tip: Use keyboard shortcuts');
  });

  it('defaults callout title to "Note" and body to empty when missing', () => {
    const chunks = extractSpeakableChunks(makeRoot('<div class="callout"></div>'));
    expect(chunks[0]!.text).toBe('Note: ');
  });

  it('falls back to "Note" when callout-title is present but empty', () => {
    const chunks = extractSpeakableChunks(
      makeRoot(
        '<div class="callout"><div class="callout-title"></div><div class="callout-body">b</div></div>',
      ),
    );
    expect(chunks[0]!.text).toBe('Note: b');
  });

  it('renders atlassian panels as "Title panel: body"', () => {
    const chunks = extractSpeakableChunks(
      makeRoot(
        '<div class="atl-panel"><div class="atl-panel-title">INFO</div>Body text here</div>',
      ),
    );
    expect(chunks[0]!.text).toBe('INFO panel: Body text here');
  });

  it('defaults atlassian panel title to "Panel" when missing', () => {
    const chunks = extractSpeakableChunks(makeRoot('<div class="atl-panel">bare</div>'));
    expect(chunks[0]!.text).toBe('Panel panel: bare');
  });

  it('renders details/summary as "Summary: body"', () => {
    const chunks = extractSpeakableChunks(
      makeRoot(
        '<details><summary>Read more</summary><div class="expand-body">Inner content</div></details>',
      ),
    );
    expect(chunks[0]!.text).toBe('Read more: Inner content');
  });

  it('defaults summary to "Expandable section" when <summary> is missing', () => {
    const chunks = extractSpeakableChunks(makeRoot('<details></details>'));
    expect(chunks[0]!.text).toBe('Expandable section: ');
  });

  it('falls back to "Expandable section" when summary is present but empty', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<details><summary></summary><div class="expand-body">b</div></details>'),
    );
    expect(chunks[0]!.text).toBe('Expandable section: b');
  });

  it('emits paragraphs as plain text', () => {
    const chunks = extractSpeakableChunks(makeRoot('<p>Hello world</p>'));
    expect(chunks).toEqual([{ text: 'Hello world', el: expect.any(HTMLElement) }]);
  });

  it('skips empty paragraphs', () => {
    const chunks = extractSpeakableChunks(makeRoot('<p>   </p>'));
    expect(chunks).toEqual([]);
  });

  it('renders blockquotes prefixed with "Quote:"', () => {
    const chunks = extractSpeakableChunks(makeRoot('<blockquote>Wisdom here</blockquote>'));
    expect(chunks[0]!.text).toBe('Quote: Wisdom here');
  });

  it('renders unordered list items verbatim', () => {
    const chunks = extractSpeakableChunks(makeRoot('<ul><li>One</li><li>Two</li></ul>'));
    expect(chunks.map((c) => c.text)).toEqual(['One', 'Two']);
  });

  it('renders ordered list items with numeric prefixes', () => {
    const chunks = extractSpeakableChunks(makeRoot('<ol><li>First</li><li>Second</li></ol>'));
    expect(chunks.map((c) => c.text)).toEqual(['1. First', '2. Second']);
  });

  it('renders task list items with "Done:" / "Not done:" prefixes', () => {
    const chunks = extractSpeakableChunks(
      makeRoot(
        '<ul class="task-list"><li><input type="checkbox" checked> done</li><li><input type="checkbox"> todo</li></ul>',
      ),
    );
    expect(chunks.map((c) => c.text)).toEqual(['Done: done', 'Not done: todo']);
  });

  it('returns nothing for an empty list', () => {
    const chunks = extractSpeakableChunks(makeRoot('<ul></ul>'));
    expect(chunks).toEqual([]);
  });

  it('renders <hr> as a pause', () => {
    const chunks = extractSpeakableChunks(makeRoot('<hr>'));
    expect(chunks[0]!.text).toBe('...');
  });

  it('renders <dl> as alternating DT:/DD pairs', () => {
    const chunks = extractSpeakableChunks(makeRoot('<dl><dt>Term</dt><dd>Definition</dd></dl>'));
    expect(chunks.map((c) => c.text)).toEqual(['Term:', 'Definition']);
  });

  it('ignores non-dt/dd children inside a <dl>', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<dl><dt>T</dt><span>stray</span><dd>D</dd></dl>'),
    );
    expect(chunks.map((c) => c.text)).toEqual(['T:', 'D']);
  });

  it('skips the footnotes section entirely (content is read inline at refs)', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<section class="footnotes"><ol><li id="fn1">lonely</li></ol></section>'),
    );
    expect(chunks).toEqual([]);
  });

  it('inlines footnote refs as side chunks anchored to the host paragraph', () => {
    const html =
      '<p>See<sup class="footnote-ref"><a href="#fn1">[1]</a></sup>.</p>' +
      '<section class="footnotes"><ol>' +
      '<li id="fn1">Note content <a class="footnote-backref">↩</a></li>' +
      '</ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual(['See.', 'Footnote: Note content.']);
    expect(chunks[0]!.el).toBe(chunks[1]!.el);
  });

  it('preserves terminal punctuation in footnote content (no double period)', () => {
    const html =
      '<p>X<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></p>' +
      '<section class="footnotes"><ol><li id="fn1">Done?</li></ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks[1]!.text).toBe('Footnote: Done?');
  });

  it('drops footnote refs with no matching target', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<p>X<sup class="footnote-ref"><a href="#missing">[1]</a></sup></p>'),
    );
    expect(chunks.map((c) => c.text)).toEqual(['X']);
  });

  it('drops footnote refs with no href', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<p>X<sup class="footnote-ref"><a>[1]</a></sup></p>'),
    );
    expect(chunks.map((c) => c.text)).toEqual(['X']);
  });

  it('ignores empty footnotes (body is only the backref)', () => {
    const html =
      '<p>X<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></p>' +
      '<section class="footnotes"><ol>' +
      '<li id="fn1"><a class="footnote-backref">↩</a></li>' +
      '</ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual(['X']);
  });

  it('replaces inline KaTeX with "inline equation"', () => {
    const html =
      '<p>Compute <span class="katex">' +
      '<span class="katex-mathml">garbled</span>' +
      '<span class="katex-html">garbled</span>' +
      '</span> now.</p>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks[0]!.text).toBe('Compute inline equation now.');
  });

  it('skips elements with katex-display class when nested inline', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<p>Before <span class="katex-display">x^2</span> after</p>'),
    );
    expect(chunks[0]!.text).toBe('Before after');
  });

  it('ignores non-element non-text nodes (comments) during extraction', () => {
    const root = document.createElement('div');
    const p = document.createElement('p');
    p.appendChild(document.createTextNode('a '));
    p.appendChild(document.createComment('skip'));
    p.appendChild(document.createTextNode('b'));
    root.appendChild(p);
    const chunks = extractSpeakableChunks(root);
    expect(chunks[0]!.text).toBe('a b');
  });

  it('inlines footnote content inside headings', () => {
    const html =
      '<h2>Title<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></h2>' +
      '<section class="footnotes"><ol><li id="fn1">note</li></ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual(['Section: Title.', 'Footnote: note.']);
  });

  it('inlines footnote content inside table rows (anchored to tr)', () => {
    const html =
      '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>A' +
      '<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></td></tr></tbody></table>' +
      '<section class="footnotes"><ol><li id="fn1">note</li></ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual([
      'A table with columns: H.',
      'Row 1. H: A.',
      'Footnote: note.',
    ]);
  });

  it('inlines footnote content inside list items', () => {
    const html =
      '<ul><li>One<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></li></ul>' +
      '<section class="footnotes"><ol><li id="fn1">note</li></ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual(['One', 'Footnote: note.']);
  });

  it('inlines footnote content inside blockquotes', () => {
    const html =
      '<blockquote>Q<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></blockquote>' +
      '<section class="footnotes"><ol><li id="fn1">note</li></ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual(['Quote: Q', 'Footnote: note.']);
  });

  it('inlines footnote content inside definition lists (keeps dt/dd ordering)', () => {
    const html =
      '<dl><dt>Term<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></dt><dd>Def</dd></dl>' +
      '<section class="footnotes"><ol><li id="fn1">note</li></ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual(['Term:', 'Footnote: note.', 'Def']);
  });

  it('inlines footnote content inside callouts', () => {
    const html =
      '<div class="callout"><div class="callout-title">T</div>' +
      '<div class="callout-body">B<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></div></div>' +
      '<section class="footnotes"><ol><li id="fn1">note</li></ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual(['T: B', 'Footnote: note.']);
  });

  it('inlines footnote content inside details blocks', () => {
    const html =
      '<details><summary>S</summary><div class="expand-body">B' +
      '<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></div></details>' +
      '<section class="footnotes"><ol><li id="fn1">note</li></ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual(['S: B', 'Footnote: note.']);
  });

  it('inlines footnote content inside atlassian panels', () => {
    const html =
      '<div class="atl-panel"><div class="atl-panel-title">INFO</div>Body' +
      '<sup class="footnote-ref"><a href="#fn1">[1]</a></sup></div>' +
      '<section class="footnotes"><ol><li id="fn1">note</li></ol></section>';
    const chunks = extractSpeakableChunks(makeRoot(html));
    expect(chunks.map((c) => c.text)).toEqual(['INFO panel: Body', 'Footnote: note.']);
  });

  it('recurses into generic containers', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<div><p>nested paragraph</p><p>another</p></div>'),
    );
    expect(chunks.map((c) => c.text)).toEqual(['nested paragraph', 'another']);
  });

  it('uses textContent fallback for leaf elements with no recognised tag', () => {
    const chunks = extractSpeakableChunks(makeRoot('<section>fallback text</section>'));
    expect(chunks[0]!.text).toBe('fallback text');
  });

  it('skips tiny (≤2 char) leaf fallbacks', () => {
    const chunks = extractSpeakableChunks(makeRoot('<span>ok</span>'));
    expect(chunks).toEqual([]);
  });
});
