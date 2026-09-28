/**
 * Clipboard HTML worth converting to Markdown: it carries document structure
 * (headings, lists, links, tables, emphasis…). Code editors such as VS Code
 * also put HTML on the clipboard, but only styled <div>/<span>/<br> — pasting
 * that as Markdown would mangle code, so plain text wins.
 */
const STRUCTURE_RE =
  /<(h[1-6]|ul|ol|li|table|blockquote|pre|strong|b|em|i|u|s|del|strike|code|img)\b|<a\s[^>]*\bhref=/i;

/** Google Docs wraps the whole selection in a non-bold <b id="docs-internal-guid-…">. */
const DOCS_WRAPPER_RE = /<b\b[^>]*\bid="docs-internal-guid-[^"]*"[^>]*>/i;

/** Google Docs expresses bold/italic as inline styles on spans, not <b>/<i>. */
const STYLED_EMPHASIS_RE =
  /<span\b[^>]*style="[^"]*(font-weight:\s*(bold|[6-9]00)|font-style:\s*italic)/i;

export const isRichDocumentHtml = (html: string): boolean => {
  if (!html) return false;
  const withoutWrapper = html.replace(DOCS_WRAPPER_RE, '');
  return STRUCTURE_RE.test(withoutWrapper) || STYLED_EMPHASIS_RE.test(withoutWrapper);
};

/**
 * Convert on paste when the clipboard holds a text document with structure.
 * A copied image also carries `<img>` HTML but no text — that one embeds.
 */
export const shouldPasteAsMarkdown = (html: string, plain: string): boolean =>
  plain.trim() !== '' && isRichDocumentHtml(html);

/** Markdown that differs from the plain text only by whitespace isn't worth the swap. */
export const isWorthConverting = (markdown: string, plain: string): boolean =>
  markdown.replace(/\s+/g, ' ').trim() !== plain.replace(/\s+/g, ' ').trim();
