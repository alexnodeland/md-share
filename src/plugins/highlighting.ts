import type hljs from 'highlight.js';
import type MarkdownIt from 'markdown-it';

export const applyHighlighting = (
  md: MarkdownIt,
  highlighter: typeof hljs,
  onUnknownLanguage?: (lang: string) => void,
): void => {
  md.options.highlight = (str, lang) => {
    // Empty string tells markdown-it to escape the source itself.
    if (lang === 'mermaid') return '';
    if (lang) {
      if (highlighter.getLanguage(lang)) {
        try {
          return highlighter.highlight(str, { language: lang }).value;
        } catch {
          /* fall through */
        }
      } else {
        onUnknownLanguage?.(lang);
      }
    }
    try {
      return highlighter.highlightAuto(str).value;
    } catch {
      return '';
    }
  };
};
