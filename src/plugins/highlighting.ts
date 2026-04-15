import type hljs from 'highlight.js';
import type MarkdownIt from 'markdown-it';

export const applyHighlighting = (md: MarkdownIt, highlighter: typeof hljs): void => {
  md.options.highlight = (str, lang) => {
    if (lang === 'mermaid') return str;
    if (lang && highlighter.getLanguage(lang)) {
      try {
        return highlighter.highlight(str, { language: lang }).value;
      } catch {
        /* fall through */
      }
    }
    try {
      return highlighter.highlightAuto(str).value;
    } catch {
      return '';
    }
  };
};
