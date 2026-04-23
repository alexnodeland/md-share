export type SuggestionKind = 'heading' | 'footnote' | 'emoji' | 'wikilink';

export interface Suggestion {
  kind: SuggestionKind;
  value: string;
  display: string;
  insertText: string;
  replaceRange: [number, number];
}

export interface CompleteContext {
  headingSlugs: readonly string[];
  footnoteLabels: readonly string[];
  wikilinkTargets: readonly string[];
  emojiShortcodes: Readonly<Record<string, string>>;
}

const MAX_SUGGESTIONS = 8;
const EMOJI_BOUNDARY_RE = /[\s([{>,.;!?]/;

const matches = (query: string, candidate: string): boolean => {
  if (query === '') return true;
  return candidate.toLowerCase().includes(query.toLowerCase());
};

const rank = (query: string, candidate: string): number => {
  if (query === '') return 0;
  const lc = candidate.toLowerCase();
  const q = query.toLowerCase();
  if (lc.startsWith(q)) return 0;
  return lc.indexOf(q) + 1;
};

const take = <T>(items: T[]): T[] => items.slice(0, MAX_SUGGESTIONS);

const findHeadingTrigger = (
  source: string,
  cursor: number,
): { query: string; start: number } | null => {
  let i = cursor - 1;
  while (i >= 0) {
    const ch = source[i]!;
    if (ch === '#') {
      if (i > 0 && source[i - 1] === '(') return { query: source.slice(i + 1, cursor), start: i };
      return null;
    }
    if (ch === '\n' || ch === ')' || ch === '(' || ch === ' ') return null;
    i--;
  }
  return null;
};

const findBracketTrigger = (
  source: string,
  cursor: number,
  marker: '[[' | '[^',
): { query: string; start: number } | null => {
  let i = cursor - 1;
  while (i >= 0) {
    const ch = source[i]!;
    if (ch === '\n' || ch === ']') return null;
    if (marker === '[[' && ch === '[' && source[i - 1] === '[') {
      return { query: source.slice(i + 1, cursor), start: i - 1 };
    }
    if (marker === '[^' && ch === '^' && source[i - 1] === '[') {
      return { query: source.slice(i + 1, cursor), start: i - 1 };
    }
    i--;
  }
  return null;
};

const IDENT_CHAR_RE = /[A-Za-z0-9_+-]/;

const findEmojiTrigger = (
  source: string,
  cursor: number,
): { query: string; start: number } | null => {
  let i = cursor - 1;
  while (i >= 0) {
    const ch = source[i]!;
    if (ch === ':') {
      if (i === 0) return { query: source.slice(1, cursor), start: 0 };
      const before = source[i - 1]!;
      if (EMOJI_BOUNDARY_RE.test(before)) {
        return { query: source.slice(i + 1, cursor), start: i };
      }
      return null;
    }
    if (!IDENT_CHAR_RE.test(ch)) return null;
    i--;
  }
  return null;
};

export const getSuggestions = (
  source: string,
  cursor: number,
  context: CompleteContext,
): Suggestion[] => {
  if (cursor < 0 || cursor > source.length) return [];

  // Check in priority order: [[ before [^ before # before :
  const wikiTrig = findBracketTrigger(source, cursor, '[[');
  if (wikiTrig) {
    const q = wikiTrig.query;
    const items = context.wikilinkTargets
      .filter((t) => matches(q, t))
      .sort((a, b) => rank(q, a) - rank(q, b))
      .map(
        (t): Suggestion => ({
          kind: 'wikilink',
          value: t,
          display: t,
          insertText: `${t}]]`,
          replaceRange: [wikiTrig.start + 2, cursor],
        }),
      );
    return take(items);
  }

  const fnTrig = findBracketTrigger(source, cursor, '[^');
  if (fnTrig) {
    const q = fnTrig.query;
    const items = context.footnoteLabels
      .filter((l) => matches(q, l))
      .sort((a, b) => rank(q, a) - rank(q, b))
      .map(
        (l): Suggestion => ({
          kind: 'footnote',
          value: l,
          display: l,
          insertText: `${l}]`,
          replaceRange: [fnTrig.start + 2, cursor],
        }),
      );
    return take(items);
  }

  const headTrig = findHeadingTrigger(source, cursor);
  if (headTrig) {
    const q = headTrig.query;
    const items = context.headingSlugs
      .filter((s) => matches(q, s))
      .sort((a, b) => rank(q, a) - rank(q, b))
      .map(
        (s): Suggestion => ({
          kind: 'heading',
          value: s,
          display: `#${s}`,
          insertText: s,
          replaceRange: [headTrig.start + 1, cursor],
        }),
      );
    return take(items);
  }

  const emojiTrig = findEmojiTrigger(source, cursor);
  if (emojiTrig) {
    const q = emojiTrig.query;
    const names = Object.keys(context.emojiShortcodes);
    const items = names
      .filter((n) => matches(q, n))
      .sort((a, b) => rank(q, a) - rank(q, b))
      .map((n): Suggestion => {
        const glyph = context.emojiShortcodes[n] as string;
        return {
          kind: 'emoji',
          value: n,
          display: `${glyph} :${n}:`,
          insertText: `:${n}: `,
          replaceRange: [emojiTrig.start, cursor],
        };
      });
    return take(items);
  }

  return [];
};
