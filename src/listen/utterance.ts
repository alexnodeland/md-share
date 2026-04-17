const MAX_LEN = 180;
const SENTENCE_RE = /[^.!?\n]+(?:[.!?]+|\n|$)/g;

const splitLong = (part: string): string[] => {
  const out: string[] = [];
  let rest = part;
  while (rest.length > MAX_LEN) {
    const slice = rest.slice(0, MAX_LEN);
    const breakAt = slice.lastIndexOf(' ');
    const cut = breakAt > 0 ? breakAt : MAX_LEN;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trimStart();
  }
  out.push(rest);
  return out;
};

export const splitUtterance = (text: string): string[] => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  if (trimmed.length <= MAX_LEN) return [trimmed];
  const sentences = trimmed.match(SENTENCE_RE) ?? [trimmed];
  const out: string[] = [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (s.length === 0) continue;
    if (s.length <= MAX_LEN) out.push(s);
    else out.push(...splitLong(s));
  }
  return out;
};
