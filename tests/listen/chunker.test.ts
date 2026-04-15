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

  it('renders the footnotes section with a header and per-item chunks', () => {
    const chunks = extractSpeakableChunks(
      makeRoot('<section class="footnotes"><ol><li>note 1</li><li>note 2</li></ol></section>'),
    );
    expect(chunks[0]!.text).toBe('Footnotes section.');
    expect(chunks.slice(1).map((c) => c.text)).toEqual(['note 1', 'note 2']);
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
