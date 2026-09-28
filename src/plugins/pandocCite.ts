import type MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import {
  type BibEntry,
  formatReference,
  narrativeName,
  parseBibtex,
  type Segment,
} from '../bibtex.ts';
import { type CrossRefEnv, isRefKey, type RefTarget, refText } from './crossRef.ts';

/**
 * Pandoc citations, numbered:
 *
 *   [@knuth84]              → [1]
 *   [see @knuth84, p. 12]   → [see 1, p. 12]
 *   [@knuth84; @lamport94]  → [1, 2]
 *   @knuth84 says           → Knuth [1] says
 *   @fig:plot / [@eq:x]     → Figure 1 / Equation (2)   (crossRef.ts labels)
 *
 * Sources come from a ```bibliography fence of BibTeX, which renders as the
 * numbered reference list. Numbers follow first citation; uncited entries
 * are listed after, in source order.
 */

export interface CiteItem {
  key: string;
  prefix: string;
  suffix: string;
}

export type ResolvedItem =
  | (CiteItem & { kind: 'source'; number: number; entry: BibEntry })
  | (CiteItem & { kind: 'ref'; target: RefTarget })
  | (CiteItem & { kind: 'missing' });

export interface CitationMeta {
  items: CiteItem[];
  narrative: boolean;
  resolved?: ResolvedItem[];
}

export interface BibliographyItem {
  number: number;
  entry: BibEntry;
  segments: Segment[];
}

export interface BibliographyMeta {
  /** The full list, on the first block only. */
  items: BibliographyItem[];
  first: boolean;
}

// Pandoc: a key starts with a letter, digit, or _, and may contain internal
// punctuation — trailing punctuation belongs to the sentence.
const KEY = String.raw`[\w](?:[\w:.#$%&+?<>~/-]*[\w])?`;
const ITEM_RE = new RegExp(`^([^@]*?)-?@(${KEY})(.*)$`, 's');
const NARRATIVE_RE = new RegExp(`^@(${KEY})`);
const WORD_RE = /[\w@]/;

export const BIBLIOGRAPHY_INFO = 'bibliography';

const parseItem = (raw: string): CiteItem | null => {
  const m = ITEM_RE.exec(raw.trim());
  if (!m) return null;
  // An `x@y` email is not a citation: `@` must not follow a word character.
  if (WORD_RE.test(m[1]!.at(-1) ?? ' ')) return null;
  return { key: m[2]!, prefix: m[1]!.trim(), suffix: m[3]!.replace(/^\s*,?\s*/, '').trim() };
};

/** markdown-it counts link nesting here (its linkify rule reads it too); @types/markdown-it omits it. */
const inLink = (state: StateInline): boolean =>
  (state as StateInline & { linkLevel: number }).linkLevel > 0;

const bracketed = (state: StateInline, silent: boolean): boolean => {
  const { src, pos } = state;
  // Inside a link's text a citation would nest one link in another. Silent
  // calls come from markdown-it measuring a link label: consuming `[@x]` there
  // would read as a nested link and break the outer one.
  if (src[pos] !== '[' || silent || inLink(state)) return false;
  const end = src.indexOf(']', pos);
  if (end === -1) return false;
  const inner = src.slice(pos + 1, end);
  // `[@x](url)` and `[@x][ref]` are links; `[x [@y]]` nests.
  if (inner.includes('[') || src[end + 1] === '(' || src[end + 1] === '[') return false;
  const items = inner.split(';').map(parseItem);
  if (!items.every((i): i is CiteItem => i !== null)) return false;
  const token = state.push('citation', '', 0);
  token.meta = { items, narrative: false } satisfies CitationMeta;
  state.pos = end + 1;
  return true;
};

const narrative = (state: StateInline, silent: boolean): boolean => {
  const { src, pos } = state;
  if (src[pos] !== '@' || inLink(state) || WORD_RE.test(src[pos - 1] ?? ' ')) return false;
  const m = NARRATIVE_RE.exec(src.slice(pos, state.posMax));
  if (!m) return false;
  if (!silent) {
    const token = state.push('citation', '', 0);
    token.meta = {
      items: [{ key: m[1]!, prefix: '', suffix: '' }],
      narrative: true,
    } satisfies CitationMeta;
  }
  state.pos += m[0].length;
  return true;
};

const isBibliography = (t: Token) =>
  t.type === 'fence' && t.info.trim().split(/\s+/, 1)[0] === BIBLIOGRAPHY_INFO;

/** Plain text of a resolved citation, for exporters and the linter. */
export const citationText = (meta: CitationMeta): string => {
  const items = meta.resolved!;
  const one = (item: ResolvedItem): string => {
    if (item.kind === 'ref') return refText(item.target);
    const core = item.kind === 'source' ? String(item.number) : `@${item.key}?`;
    return [item.prefix, core].filter(Boolean).join(' ') + (item.suffix ? `, ${item.suffix}` : '');
  };
  if (meta.narrative) {
    const item = items[0]!;
    if (item.kind === 'source') return `${narrativeName(item.entry)} [${item.number}]`;
    if (item.kind === 'ref') return refText(item.target);
    return isRefKey(item.key) ? `@${item.key}?` : `@${item.key}`;
  }
  const text = items.map(one).join(', ');
  return items.every((i) => i.kind === 'ref') ? text : `[${text}]`;
};

/** Resolve every citation in document order; returns each cited source's number. */
const numberCitations = (
  tokens: readonly Token[],
  entries: ReadonlyMap<string, BibEntry>,
  refs: ReadonlyMap<string, RefTarget>,
): Map<string, number> => {
  const numbers = new Map<string, number>();
  const resolve = (item: CiteItem): ResolvedItem => {
    if (isRefKey(item.key)) {
      const target = refs.get(item.key);
      return target ? { ...item, kind: 'ref', target } : { ...item, kind: 'missing' };
    }
    const entry = entries.get(item.key);
    if (!entry) return { ...item, kind: 'missing' };
    if (!numbers.has(item.key)) numbers.set(item.key, numbers.size + 1);
    return { ...item, kind: 'source', number: numbers.get(item.key)!, entry };
  };
  for (const t of tokens) {
    if (t.type !== 'inline') continue;
    for (const child of t.children!) {
      if (child.type !== 'citation') continue;
      const meta = child.meta as CitationMeta;
      meta.resolved = meta.items.map(resolve);
      child.content = citationText(meta);
    }
  }
  return numbers;
};

export const pluginPandocCite = (md: MarkdownIt): void => {
  md.inline.ruler.before('link', 'citation', bracketed);
  md.inline.ruler.after('citation', 'citation_narrative', narrative);

  // Pushed last, so cross-references (if the flavor has them) are numbered first.
  md.core.ruler.push('citations', (state) => {
    const tokens = state.tokens;
    const lists = tokens.filter(isBibliography);
    const entries = new Map<string, BibEntry>();
    for (const t of lists)
      for (const e of parseBibtex(t.content)) if (!entries.has(e.key)) entries.set(e.key, e);

    const numbers = numberCitations(
      tokens,
      entries,
      (state.env as CrossRefEnv).crossRefs ?? new Map(),
    );
    for (const key of entries.keys()) if (!numbers.has(key)) numbers.set(key, numbers.size + 1);

    const list: BibliographyItem[] = [...entries.values()]
      .map((entry) => ({
        number: numbers.get(entry.key)!,
        entry,
        segments: formatReference(entry),
      }))
      .sort((a, b) => a.number - b.number);
    // The full list renders at the first bibliography block; later ones only add sources.
    lists.forEach((t, i) => {
      t.type = 'bibliography';
      t.meta = { items: i === 0 ? list : [], first: i === 0 } satisfies BibliographyMeta;
    });
  });

  const esc = md.utils.escapeHtml;
  const refId = (key: string) => esc(`ref-${key}`);
  const affix = (item: CiteItem, core: string) =>
    [item.prefix && esc(item.prefix), core].filter(Boolean).join(' ') +
    (item.suffix ? `, ${esc(item.suffix)}` : '');
  const refLink = (item: ResolvedItem & { kind: 'ref' }) =>
    `<a class="xref" href="#${esc(item.key)}">${esc(refText(item.target))}</a>`;
  const missing = (item: CiteItem) => {
    const why = isRefKey(item.key)
      ? `Nothing in this document is labelled ${item.key}`
      : `No source ${item.key} in the bibliography`;
    return `<span class="citation-missing" title="${esc(why)}">@${esc(item.key)}?</span>`;
  };

  md.renderer.rules.citation = (tokens, idx) => {
    const meta = tokens[idx]!.meta as CitationMeta;
    const items = meta.resolved!;
    if (meta.narrative) {
      const item = items[0]!;
      if (item.kind === 'ref') return refLink(item);
      if (item.kind === 'missing') return isRefKey(item.key) ? missing(item) : esc(`@${item.key}`);
      return `${esc(narrativeName(item.entry))} <span class="citation">[<a href="#${refId(item.key)}">${item.number}</a>]</span>`;
    }
    const parts = items.map((item) => {
      if (item.kind === 'ref') return affix(item, refLink(item));
      if (item.kind === 'missing') return affix(item, missing(item));
      return affix(item, `<a href="#${refId(item.key)}">${item.number}</a>`);
    });
    return items.every((i) => i.kind === 'ref')
      ? parts.join(', ')
      : `<span class="citation">[${parts.join(', ')}]</span>`;
  };

  const segmentHtml = (s: Segment) => {
    const text = esc(s.text);
    if (s.link)
      return `<a href="${esc(s.link)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    return s.italic ? `<em>${text}</em>` : text;
  };
  md.renderer.rules.bibliography = (tokens, idx) => {
    const { items, first } = tokens[idx]!.meta as BibliographyMeta;
    if (!first) return '';
    if (items.length === 0)
      return '<p class="bibliography-empty">Bibliography: no BibTeX entries found in this block.</p>\n';
    const rows = items
      .map(
        (item) =>
          `<li id="${refId(item.entry.key)}" value="${item.number}">${item.segments.map(segmentHtml).join('')}</li>`,
      )
      .join('\n');
    return `<ol class="references">\n${rows}\n</ol>\n`;
  };
};
