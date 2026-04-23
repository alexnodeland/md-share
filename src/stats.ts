export interface DocumentStats {
  characters: number;
  words: number;
  readingTimeMinutes: number;
}

const WORD_RE = /\S+/g;
const WORDS_PER_MINUTE = 200;

const readingTimeMinutes = (words: number): number => {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

export const countStats = (source: string): DocumentStats => {
  const wordTokens = source.match(WORD_RE) ?? [];
  const words = wordTokens.length;
  return {
    characters: source.length,
    words,
    readingTimeMinutes: readingTimeMinutes(words),
  };
};

export const formatStats = ({ characters, words, readingTimeMinutes }: DocumentStats): string => {
  const w = words === 1 ? '1 word' : `${words.toLocaleString()} words`;
  const c = characters === 1 ? '1 character' : `${characters.toLocaleString()} characters`;
  const r = readingTimeMinutes === 1 ? '1 min read' : `${readingTimeMinutes} min read`;
  return `${w} · ${c} · ${r}`;
};
