import type hljs from 'highlight.js';
import type MarkdownIt from 'markdown-it';

export const applyHighlighting = (
  md: MarkdownIt,
  highlighter: typeof hljs,
  onUnknownLanguage?: (lang: string) => void,
): void => {
  // Returning '' tells markdown-it to escape the code itself. Unlabelled
  // fences stay plain (as on GitHub): grammars load on demand, so there is
  // nothing reliable to auto-detect against.
  md.options.highlight = (str, lang) => {
    if (!lang || lang === 'mermaid') return '';
    if (!highlighter.getLanguage(lang)) {
      onUnknownLanguage?.(lang);
      return '';
    }
    try {
      return highlighter.highlight(str, { language: lang }).value;
    } catch {
      return '';
    }
  };
};
