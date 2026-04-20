import { cleanHeadingText, slugifyHeading, uniqueSlug } from './slug.ts';
import type { TocHeading } from './types.ts';

const HEADING_RE = /^(#{2,4})\s+(.+)/;
const FENCE_RE = /^```/;

export const parseHeadings = (source: string): TocHeading[] => {
  const headings: TocHeading[] = [];
  const used = new Map<string, number>();
  let inFence = false;
  for (const line of source.split('\n')) {
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(HEADING_RE);
    if (!match) continue;
    const hashes = match[1] as string;
    const text = cleanHeadingText(match[2] as string);
    const level = hashes.length as 2 | 3 | 4;
    headings.push({ level, text, slug: uniqueSlug(slugifyHeading(text), used) });
  }
  return headings;
};

const MIN_HEADINGS_FOR_TOC = 3;

export const renderTOC = (headings: readonly TocHeading[]): string => {
  if (headings.length < MIN_HEADINGS_FOR_TOC) return '';
  const items = headings
    .map((h) => `<li class="toc-h${h.level}"><a href="#${h.slug}">${h.text}</a></li>`)
    .join('');
  return `<div class="toc-container"><div class="toc-title">Contents</div><ul>${items}</ul></div>`;
};

export const generateTOC = (source: string): string => renderTOC(parseHeadings(source));
