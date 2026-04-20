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

const norm = (s: string, cs: boolean): string => (cs ? s : s.toLowerCase());

export const findNext = (
  haystack: string,
  needle: string,
  from: number,
  opts: FindOptions,
): Match | null => {
  if (!needle) return null;
  const hay = norm(haystack, opts.caseSensitive);
  const nee = norm(needle, opts.caseSensitive);
  let idx = hay.indexOf(nee, Math.max(0, from));
  if (idx === -1 && from > 0) idx = hay.indexOf(nee);
  if (idx === -1) return null;
  return { start: idx, end: idx + needle.length };
};

export const findPrev = (
  haystack: string,
  needle: string,
  from: number,
  opts: FindOptions,
): Match | null => {
  if (!needle) return null;
  const hay = norm(haystack, opts.caseSensitive);
  const nee = norm(needle, opts.caseSensitive);
  const ceiling = from - 1;
  let idx = ceiling >= 0 ? hay.lastIndexOf(nee, ceiling) : -1;
  if (idx === -1) idx = hay.lastIndexOf(nee);
  if (idx === -1) return null;
  return { start: idx, end: idx + needle.length };
};

export const findAll = (haystack: string, needle: string, opts: FindOptions): Match[] => {
  if (!needle) return [];
  const hay = norm(haystack, opts.caseSensitive);
  const nee = norm(needle, opts.caseSensitive);
  const out: Match[] = [];
  let from = 0;
  while (from <= hay.length) {
    const idx = hay.indexOf(nee, from);
    if (idx === -1) break;
    out.push({ start: idx, end: idx + needle.length });
    from = idx + Math.max(nee.length, 1);
  }
  return out;
};

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
