const HEADING_RE = /^(#{1,6})\s+(.+)/;
const FENCE_RE = /^```/;
const STRIP_RE = /[*_`[\]#]/g;
const NON_SLUG_RE = /[^\w\s-]/g;
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
    const text = (match[2] as string).replace(STRIP_RE, '').trim();
    if (text) return text;
  }
  return null;
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
  const heading = firstHeadingText(source);
  const slug = heading ? slugifyFilename(heading) : '';
  return `${slug || DEFAULT_STEM}.${extension}`;
};
