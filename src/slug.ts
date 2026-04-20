const STRIP_RE = /[*_`[\]#]/g;
const NON_SLUG_RE = /[^\w\s-]/g;
const WHITESPACE_RE = /\s+/g;

export const cleanHeadingText = (text: string): string => text.replace(STRIP_RE, '').trim();

export const slugifyHeading = (text: string): string =>
  cleanHeadingText(text).toLowerCase().replace(NON_SLUG_RE, '').replace(WHITESPACE_RE, '-');

export const uniqueSlug = (base: string, used: Map<string, number>): string => {
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? base : `${base}-${n + 1}`;
};
