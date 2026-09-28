/**
 * Just enough BibTeX for a reference list: what Google Scholar, Zotero, and
 * journal sites hand out. Malformed entries are skipped, never fatal.
 */

export interface BibEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
}

/** A run of reference-list text; exporters map these to their own markup. */
export interface Segment {
  text: string;
  italic?: true;
  link?: string;
}

const SKIPPED_TYPES = new Set(['comment', 'string', 'preamble']);

/** The balanced `{…}` starting at `open`; returns the index after its `}`, or -1. */
const closeBrace = (src: string, open: number): number => {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '\\') i++;
    else if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return i + 1;
  }
  return -1;
};

/** One field value: `{…}`, `"…"`, or a bare number/macro. Returns [raw, next index]. */
const readValue = (body: string, at: number): [string, number] => {
  let i = at;
  while (/\s/.test(body[i] ?? '')) i++;
  if (body[i] === '{') {
    const end = closeBrace(body, i);
    return end === -1 ? [body.slice(i + 1), body.length] : [body.slice(i + 1, end - 1), end];
  }
  if (body[i] === '"') {
    let end = i + 1;
    let depth = 0;
    while (end < body.length && !(body[end] === '"' && depth === 0)) {
      if (body[end] === '{') depth++;
      if (body[end] === '}') depth--;
      end++;
    }
    return [body.slice(i + 1, end), end + 1];
  }
  const bare = /^[^,}\s]*/.exec(body.slice(i))![0];
  return [bare, i + bare.length];
};

const parseFields = (body: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  const nameRe = /\s*,?\s*([A-Za-z][\w-]*)\s*=/y;
  let at = 0;
  for (;;) {
    nameRe.lastIndex = at;
    const name = nameRe.exec(body);
    if (!name) return fields;
    const [raw, next] = readValue(body, nameRe.lastIndex);
    fields[name[1]!.toLowerCase()] = cleanLatex(raw);
    at = next;
  }
};

export const parseBibtex = (src: string): BibEntry[] => {
  const entries: BibEntry[] = [];
  const startRe = /@([A-Za-z]+)\s*\{/g;
  for (let m = startRe.exec(src); m; m = startRe.exec(src)) {
    const open = m.index + m[0].length - 1;
    const end = closeBrace(src, open);
    const inner = src.slice(open + 1, end === -1 ? src.length : end - 1);
    startRe.lastIndex = end === -1 ? src.length : end;
    const type = m[1]!.toLowerCase();
    const comma = inner.indexOf(',');
    const key = inner.slice(0, comma).trim();
    if (SKIPPED_TYPES.has(type) || comma === -1 || !key) continue;
    entries.push({ type, key, fields: parseFields(inner.slice(comma + 1)) });
  }
  return entries;
};

// \"o → ö and friends: the accent commands names in .bib files actually use.
const ACCENTS: Record<string, string> = {
  '"': '̈',
  "'": '́',
  '`': '̀',
  '^': '̂',
  '~': '̃',
  '=': '̄',
  '.': '̇',
  c: '̧',
  u: '̆',
  v: '̌',
  H: '̋',
};
const LETTERS: Record<string, string> = {
  ss: 'ß',
  o: 'ø',
  O: 'Ø',
  aa: 'å',
  AA: 'Å',
  ae: 'æ',
  AE: 'Æ',
  oe: 'œ',
  OE: 'Œ',
  l: 'ł',
  L: 'Ł',
  i: 'ı',
};

/** BibTeX-escaped text → what a reader should see. */
export const cleanLatex = (raw: string): string =>
  raw
    .replace(/\\([`'^"~=.])\s*\{?\\?([A-Za-z])\}?/g, (_, a: string, l: string) =>
      (l + ACCENTS[a]).normalize('NFC'),
    )
    .replace(/\\([cuvH])\s*\{\\?([A-Za-z])\}/g, (_, a: string, l: string) =>
      (l + ACCENTS[a]).normalize('NFC'),
    )
    .replace(/\\(ss|aa|AA|ae|AE|oe|OE|[oOlLi])(?![A-Za-z])\s?/g, (_, n: string) => LETTERS[n]!)
    .replace(/\\([&%$#_{}])/g, '$1')
    // \TeX and \LaTeX read as their names; formatting commands (\emph{…}) just go.
    .replace(/\\(La)?TeX(?![A-Za-z])/g, (m) => m.slice(1))
    .replace(/\\[A-Za-z]+\s*/g, '')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/~/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();

interface Name {
  first: string;
  last: string;
}

/** "Last, First" or "First Last" (with "van"/"de" particles kept with the surname). */
const parseName = (raw: string): Name => {
  const comma = raw.indexOf(',');
  if (comma !== -1) return { last: raw.slice(0, comma).trim(), first: raw.slice(comma + 1).trim() };
  const words = raw.trim().split(/\s+/);
  const particle = words.findIndex((w, i) => i > 0 && /^[a-z]/.test(w));
  const split = particle === -1 ? words.length - 1 : particle;
  return { first: words.slice(0, split).join(' '), last: words.slice(split).join(' ') };
};

const names = (field: string | undefined): Name[] =>
  field
    ? field
        .split(/\s+and\s+/)
        .filter((n) => n.trim())
        .map(parseName)
    : [];

const joinList = (items: string[]): string => {
  if (items.length <= 2) return items.join(' and ');
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
};

const fullName = (n: Name) => (n.first ? `${n.first} ${n.last}` : n.last);

/** How the text names a source: "Knuth", "Knuth and Lamport", "Knuth et al.". */
export const narrativeName = (entry: BibEntry): string => {
  const people = names(entry.fields.author ?? entry.fields.editor);
  if (people.length === 0) return entry.fields.title ?? entry.key;
  if (people.length === 1) return people[0]!.last;
  if (people.length === 2) return `${people[0]!.last} and ${people[1]!.last}`;
  return `${people[0]!.last} et al.`;
};

const CONTAINED = new Set(['article', 'inproceedings', 'incollection', 'inbook', 'conference']);

const addPeriod = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`);

const byline = (f: Record<string, string>): string => {
  const people = names(f.author);
  if (people.length) return `${addPeriod(joinList(people.map(fullName)))} `;
  const editors = names(f.editor);
  if (!editors.length) return '';
  return `${joinList(editors.map(fullName))}, ed${editors.length > 1 ? 's' : ''}. `;
};

const venue = (f: Record<string, string>): Segment[] => {
  const name = f.journal ?? f.booktitle;
  if (!name) return [];
  const volume = f.volume ? ` ${f.volume}${f.number ? ` (${f.number})` : ''}` : '';
  return [{ text: name, italic: true }, { text: `${volume}${f.pages ? `: ${f.pages}` : ''}. ` }];
};

const webLink = (f: Record<string, string>): Segment[] => {
  const href = f.doi
    ? `https://doi.org/${f.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}`
    : f.url;
  if (!href) return [];
  // Only web links become links; anything else (javascript:, file:) stays text.
  return [/^https?:\/\//i.test(href) ? { text: href, link: href } : { text: href }];
};

/** "2" → "2nd"; "Second" stays as written. */
const edition = (raw: string): string => {
  if (!/^\d+$/.test(raw)) return raw;
  const n = Number(raw);
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
};

/** A readable reference-list entry: authors, year, title, venue, link. */
export const formatReference = (entry: BibEntry): Segment[] => {
  const f = entry.fields;
  const out: Segment[] = [];
  const text = (t: string) => {
    if (t) out.push({ text: t });
  };
  text(byline(f));
  if (f.year) text(`${f.year}. `);
  if (f.title && CONTAINED.has(entry.type)) text(`“${addPeriod(f.title)}” `);
  else if (f.title) out.push({ text: addPeriod(f.title), italic: true }, { text: ' ' });
  if (f.edition) text(`${edition(f.edition)} ed. `);
  out.push(...venue(f));
  const publisher = [f.publisher ?? f.institution ?? f.school, f.address].filter(Boolean);
  if (publisher.length) text(`${addPeriod(publisher.join(', '))} `);
  out.push(...webLink(f));
  const last = out.at(-1);
  if (last && !last.link) last.text = last.text.trimEnd();
  return out.length ? out : [{ text: entry.key }];
};
