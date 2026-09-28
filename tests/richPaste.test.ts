import { describe, expect, it } from 'vitest';
import { isRichDocumentHtml, isWorthConverting, shouldPasteAsMarkdown } from '../src/richPaste.ts';

describe('isRichDocumentHtml', () => {
  it.each([
    '<h2>Title</h2>',
    '<ul><li>a</li></ul>',
    '<p>see <a href="https://x.dev">docs</a></p>',
    '<table><tr><td>1</td></tr></table>',
    '<p><strong>bold</strong></p>',
    '<blockquote>q</blockquote>',
  ])('converts structured HTML: %s', (html) => {
    expect(isRichDocumentHtml(html)).toBe(true);
  });

  it('converts Google Docs styled spans', () => {
    const html =
      '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><p><span style="font-weight:700">Bold</span></p></b>';
    expect(isRichDocumentHtml(html)).toBe(true);
    expect(isRichDocumentHtml('<span style="font-style:italic">it</span>')).toBe(true);
  });

  it('ignores the Google Docs wrapper when judging structure', () => {
    const html =
      '<b style="font-weight:normal;" id="docs-internal-guid-9"><p><span>plain</span></p></b>';
    expect(isRichDocumentHtml(html)).toBe(false);
  });

  it('leaves code-editor HTML (styled divs and spans) as plain text', () => {
    const vscode =
      '<div style="color: #d4d4d4;background-color: #1e1e1e;"><div><span style="color: #569cd6;">const</span> x = 1;</div><br></div>';
    expect(isRichDocumentHtml(vscode)).toBe(false);
  });

  it('is false for empty or anchor-less HTML', () => {
    expect(isRichDocumentHtml('')).toBe(false);
    expect(isRichDocumentHtml('<a name="x">anchor</a>')).toBe(false);
  });
});

describe('isWorthConverting', () => {
  it('is false when the Markdown only differs in whitespace', () => {
    expect(isWorthConverting('hello\n\nworld', 'hello world')).toBe(false);
  });

  it('is true when the conversion adds structure', () => {
    expect(isWorthConverting('## Title', 'Title')).toBe(true);
  });
});

describe('shouldPasteAsMarkdown', () => {
  it('converts structured HTML that comes with text', () => {
    expect(shouldPasteAsMarkdown('<h1>Hi</h1>', 'Hi')).toBe(true);
  });

  it('leaves a copied image (HTML but no text) to the image embed path', () => {
    expect(shouldPasteAsMarkdown('<img src="https://x.dev/a.png">', '')).toBe(false);
  });

  it('pastes plain text when there is no rich HTML', () => {
    expect(shouldPasteAsMarkdown('', 'just text')).toBe(false);
  });
});
