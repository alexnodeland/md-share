import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

// `[[lang:xx]]` or `[[lang:xx-YY]]` on its own line. Simplified BCP-47:
// 2–3 letter primary tag, optional 2-letter uppercase region subtag.
const DIRECTIVE_LINE_RE = /^[ \t]*\[\[lang:([^\]]+)\]\][ \t]*$/;
const LANG_VALIDATE_RE = /^[a-zA-Z]{2,3}(-[A-Z]{2})?$/;

const BLOCK_OPEN_TYPES = new Set<string>([
  'heading_open',
  'paragraph_open',
  'bullet_list_open',
  'ordered_list_open',
  'blockquote_open',
]);

const extractDirectiveLang = (inline: Token): string | null => {
  const match = inline.content.match(DIRECTIVE_LINE_RE);
  if (!match) return null;
  const raw = match[1]!.trim();
  return LANG_VALIDATE_RE.test(raw) ? raw : '';
};

/**
 * `[[lang:xx-YY]]` on its own line sets the language for subsequent block-level
 * elements (headings, paragraphs, lists, blockquotes) until the next directive
 * or end-of-document. Invalid language tags silently strip the directive
 * without applying any `lang` attribute.
 *
 * The directive line is removed from the output. The validated language is
 * attached to each subsequent block-opening token via `token.attrSet('lang', …)`
 * so the chunker can pass it to the speech synthesizer.
 */
export const pluginBlockLang = (md: MarkdownIt): void => {
  md.core.ruler.before('linkify', 'block_lang', (state) => {
    const tokens = state.tokens;
    let current: string | null = null;
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i]!;
      if (token.type === 'paragraph_open') {
        // markdown-it invariant: every paragraph_open is immediately followed
        // by exactly one inline token, then its paragraph_close.
        const inline = tokens[i + 1]!;
        const parsed = extractDirectiveLang(inline);
        if (parsed !== null) {
          // Valid directive: remember the new language; invalid: reset.
          current = parsed.length > 0 ? parsed : null;
          tokens.splice(i, 3);
          continue;
        }
      }
      if (current !== null && BLOCK_OPEN_TYPES.has(token.type)) {
        token.attrSet('lang', current);
      }
      i++;
    }
  });
};
