import { escapeHtml } from './escapeHtml.ts';
import type { Theme } from './types.ts';

export const FONTS_CSS_URL =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap';
/** CDN copy of the stylesheet for the KaTeX version that rendered the math. */
export const katexCssUrl = (version: string): string =>
  `https://cdn.jsdelivr.net/npm/katex@${version}/dist/katex.min.css`;

// The app shell locks <html>/<body> to the viewport; a standalone page must scroll.
const PAGE_CSS = `html,body{height:auto;overflow:auto}body{background:var(--preview-bg);padding:48px 24px}@media (max-width:600px){body{padding:24px 16px}}`;

export interface StandaloneHtmlInput {
  title: string | null;
  bodyHtml: string;
  css: string;
  theme: Theme;
  /** Version of the KaTeX that rendered the body; null when none loaded. */
  katexVersion: string | null;
}

/**
 * A single self-contained HTML file that looks like the preview and opens
 * anywhere. Only fonts and (when math is present) KaTeX CSS are linked; the
 * document still reads correctly offline with fallback fonts.
 */
export const buildStandaloneHtml = ({
  title,
  bodyHtml,
  css,
  theme,
  katexVersion,
}: StandaloneHtmlInput): string => {
  const katexLink =
    katexVersion && bodyHtml.includes('class="katex')
      ? `<link rel="stylesheet" href="${katexCssUrl(katexVersion)}" crossorigin="anonymous">`
      : '';
  return [
    '<!DOCTYPE html>',
    `<html lang="en" data-theme="${theme}">`,
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="generator" content="md-share">',
    `<title>${escapeHtml(title ?? 'Document')}</title>`,
    `<link rel="stylesheet" href="${FONTS_CSS_URL}">`,
    katexLink,
    `<style>${css}\n${PAGE_CSS}</style>`,
    '</head>',
    '<body>',
    `<main class="rendered">${bodyHtml}</main>`,
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
};
