export interface Match {
  start: number;
  end: number;
}

export interface FindOptions {
  caseSensitive: boolean;
}

export interface ReplaceResult {
  value: string;
  cursor: number;
}

export interface ReplaceAllResult {
  value: string;
  count: number;
}

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

// Matching runs on the original text (never a lower-cased copy, whose length
// can differ — "İ".toLowerCase() is two code units), so offsets stay exact.
const pattern = (needle: string, opts: FindOptions): RegExp =>
  new RegExp(needle.replace(REGEX_SPECIALS, '\\$&'), opts.caseSensitive ? 'gu' : 'giu');

export const findAll = (haystack: string, needle: string, opts: FindOptions): Match[] => {
  if (!needle) return [];
  return Array.from(haystack.matchAll(pattern(needle, opts)), (m) => ({
    start: m.index,
    end: m.index + m[0].length,
  }));
};

/** First match at or after `from`, wrapping to the top. */
export const findNext = (
  haystack: string,
  needle: string,
  from: number,
  opts: FindOptions,
): Match | null => {
  const all = findAll(haystack, needle, opts);
  return all.find((m) => m.start >= from) ?? all[0] ?? null;
};

/** Last match starting before `from`, wrapping to the bottom. */
export const findPrev = (
  haystack: string,
  needle: string,
  from: number,
  opts: FindOptions,
): Match | null => {
  const all = findAll(haystack, needle, opts);
  return all.filter((m) => m.start < from).at(-1) ?? all.at(-1) ?? null;
};

/**
 * The match Replace should act on: the selected one, else the one the caret
 * is inside, else the next one, else the first. Adjacent matches share a
 * boundary, so containment alone would pick the previous match.
 */
export const pickReplaceTarget = (
  matches: readonly Match[],
  selStart: number,
  selEnd: number,
): Match | null =>
  matches.find((m) => m.start === selStart && m.end === selEnd) ??
  matches.find((m) => m.start <= selStart && selStart < m.end) ??
  matches.find((m) => m.start >= selStart) ??
  matches[0] ??
  null;

export const replaceOne = (haystack: string, match: Match, replacement: string): ReplaceResult => ({
  value: haystack.slice(0, match.start) + replacement + haystack.slice(match.end),
  cursor: match.start + replacement.length,
});

export const replaceAll = (
  haystack: string,
  needle: string,
  replacement: string,
  opts: FindOptions,
): ReplaceAllResult => {
  const matches = findAll(haystack, needle, opts);
  if (matches.length === 0) return { value: haystack, count: 0 };
  let value = haystack;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i]!;
    value = value.slice(0, m.start) + replacement + value.slice(m.end);
  }
  return { value, count: matches.length };
};
