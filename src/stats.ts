export interface DocumentStats {
  characters: number;
  words: number;
}

const WORD_RE = /\S+/g;

export const countStats = (source: string): DocumentStats => ({
  characters: source.length,
  words: source.match(WORD_RE)?.length ?? 0,
});

export const formatStats = ({ characters, words }: DocumentStats): string => {
  const w = words === 1 ? '1 word' : `${words.toLocaleString()} words`;
  const c = characters === 1 ? '1 character' : `${characters.toLocaleString()} characters`;
  return `${w} · ${c}`;
};
