export interface DocumentStats {
  characters: number;
  words: number;
  readingTimeMinutes: number;
  fleschKincaid: number | null;
  headingCount: number;
  linkCount: number;
}

const WORD_RE = /\S+/g;
const HEADING_RE = /^#{1,6}\s/;
const LINK_RE = /\[[^\]]*\]\([^)]*\)/g;
const SENTENCE_RE = /[.!?]+(?=\s|$)/g;
const VOWEL_GROUP_RE = /[aeiouy]+/g;
const SILENT_E_RE = /e$/;
const WORDS_PER_MINUTE = 200;
const MIN_WORDS_FOR_READABILITY = 100;

const countSyllables = (word: string): number => {
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.length === 0) return 0;
  const groups = lower.match(VOWEL_GROUP_RE) ?? [];
  let syllables = groups.length;
  if (syllables > 1 && SILENT_E_RE.test(lower)) syllables -= 1;
  return Math.max(1, syllables);
};

const countHeadings = (source: string): number => {
  let count = 0;
  for (const line of source.split(/\r?\n/)) {
    if (HEADING_RE.test(line)) count += 1;
  }
  return count;
};

const countLinks = (source: string): number => source.match(LINK_RE)?.length ?? 0;

const countSentences = (source: string): number => source.match(SENTENCE_RE)?.length ?? 0;

const readingTimeMinutes = (words: number): number => {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const fleschKincaidGrade = (
  source: string,
  wordTokens: readonly string[],
  wordCount: number,
): number | null => {
  if (wordCount < MIN_WORDS_FOR_READABILITY) return null;
  const sentences = Math.max(1, countSentences(source));
  let syllableTotal = 0;
  for (const token of wordTokens) syllableTotal += countSyllables(token);
  const wordsPerSentence = wordCount / sentences;
  const syllablesPerWord = syllableTotal / wordCount;
  const grade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  return Math.round(grade * 10) / 10;
};

export const countStats = (source: string): DocumentStats => {
  const wordTokens = source.match(WORD_RE) ?? [];
  const words = wordTokens.length;
  return {
    characters: source.length,
    words,
    readingTimeMinutes: readingTimeMinutes(words),
    fleschKincaid: fleschKincaidGrade(source, wordTokens, words),
    headingCount: countHeadings(source),
    linkCount: countLinks(source),
  };
};

export const formatStats = ({
  characters,
  words,
  readingTimeMinutes,
  fleschKincaid,
  headingCount,
  linkCount,
}: DocumentStats): string => {
  const w = words === 1 ? '1 word' : `${words.toLocaleString()} words`;
  const c = characters === 1 ? '1 character' : `${characters.toLocaleString()} characters`;
  const r = readingTimeMinutes === 1 ? '1 min read' : `${readingTimeMinutes} min read`;
  const h = headingCount === 1 ? '1 heading' : `${headingCount.toLocaleString()} headings`;
  const l = linkCount === 1 ? '1 link' : `${linkCount.toLocaleString()} links`;
  const fk = fleschKincaid === null ? 'grade —' : `grade ${fleschKincaid.toFixed(1)}`;
  return `${w} · ${c} · ${r} · ${h} · ${l} · ${fk}`;
};
