const NON_SLUG_RE = /[^\p{L}\p{M}\p{N}\s_-]/gu;
const WHITESPACE_RE = /\s+/g;

/** GitHub-style slug from a heading's plain text; keeps non-ASCII letters. */
export const slugifyHeading = (text: string): string =>
  text.trim().toLowerCase().replace(NON_SLUG_RE, '').replace(WHITESPACE_RE, '-');

export const uniqueSlug = (base: string, used: Map<string, number>): string => {
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? base : `${base}-${n + 1}`;
};
