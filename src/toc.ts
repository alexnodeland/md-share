import { escapeHtml } from './escapeHtml.ts';
import type { DocHeading } from './types.ts';

const MIN_HEADINGS_FOR_TOC = 3;
const TOC_MIN_LEVEL = 2;
const TOC_MAX_LEVEL = 4;

/** Renders h2–h4 from the outline the heading-anchor rule records. */
export const renderTOC = (headings: readonly DocHeading[]): string => {
  const entries = headings.filter((h) => h.level >= TOC_MIN_LEVEL && h.level <= TOC_MAX_LEVEL);
  if (entries.length < MIN_HEADINGS_FOR_TOC) return '';
  const items = entries
    .map(
      (h) =>
        `<li class="toc-h${h.level}"><a href="#${escapeHtml(h.slug)}">${escapeHtml(h.text)}</a></li>`,
    )
    .join('');
  return `<div class="toc-container"><div class="toc-title">Contents</div><ul>${items}</ul></div>`;
};
