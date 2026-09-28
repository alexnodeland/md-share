import { parseFrontmatter } from './frontmatter.ts';

const HEADING_RE = /^(#{1,6})\s+(.+)/;
const FENCE_RE = /^(```|~~~)/;
const LINK_RE = /\[([^\]]*)\]\([^)]*\)/g;
const STRIP_RE = /[*_`[\]#]/g;
const NON_SLUG_RE = /[^\p{L}\p{N}\s-]/gu;
const WHITESPACE_RE = /\s+/g;
const TRIM_DASH_RE = /^-+|-+$/g;
const MAX_SLUG_LENGTH = 60;
const DEFAULT_STEM = 'document';

export const firstHeadingText = (source: string): string | null => {
  let inFence = false;
  for (const line of source.split('\n')) {
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(HEADING_RE);
    if (!match) continue;
    const text = (match[2] as string).replace(LINK_RE, '$1').replace(STRIP_RE, '').trim();
    if (text) return text;
  }
  return null;
};

/** Frontmatter `title:` wins; otherwise the first heading of the body. */
export const documentTitle = (source: string): string | null => {
  const { meta, body } = parseFrontmatter(source);
  const title = meta.title?.trim();
  return title || firstHeadingText(body);
};

/** Browser tab title: the document's title, then the app name. */
export const pageTitle = (source: string): string => {
  const title = documentTitle(source);
  return title ? `${title} · md-share` : 'md-share';
};

export const slugifyFilename = (text: string): string =>
  text
    .toLowerCase()
    .replace(NON_SLUG_RE, '')
    .replace(WHITESPACE_RE, '-')
    .replace(TRIM_DASH_RE, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(TRIM_DASH_RE, '');

export const deriveFilename = (source: string, extension: string): string => {
  const title = documentTitle(source);
  const slug = title ? slugifyFilename(title) : '';
  return `${slug || DEFAULT_STEM}.${extension}`;
};
