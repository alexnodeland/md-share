import { narrativeName, parseBibtex } from './bibtex.ts';
import type { EditResult } from './editorCommands.ts';
import type { DocHeading } from './types.ts';

export type CompletionKind = 'anchor' | 'footnote' | 'citation';

/** The partial reference the cursor sits at the end of: `](#par`, `[^par`, or `@par`. */
export interface CompletionContext {
  kind: CompletionKind;
  /** Start of the partial text being completed (after `#` / `^`). */
  from: number;
  to: number;
  query: string;
}

export interface Completion {
  label: string;
  /** The text that replaces the query. */
  value: string;
  detail: string;
}

const ANCHOR_RE = /\]\(#([^\s)]*)$/;
const FOOTNOTE_RE = /\[\^([^\]\s]*)$/;
const DEFINITION_RE = /^\[\^([^\]\s]+)\]:/gm;
// `@` at a word boundary: `[@kn`, `; @kn`, `-@kn`, or narrative `as @kn`.
const CITATION_RE = /(?:^|[\s[;-])@([\w:.#$%&+?<>~/-]*)$/;
const BIBLIOGRAPHY_RE = /^```bibliography[^\n]*\n([\s\S]*?)^```/gm;
const LABEL_RE = /\{#((fig|tbl|eq):[\w.:-]+)\}/g;
const LABEL_KINDS: Record<string, string> = { fig: 'figure', tbl: 'table', eq: 'equation' };
const MAX_SUGGESTIONS = 8;

export const completionContext = (value: string, cursor: number): CompletionContext | null => {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
  const before = value.slice(lineStart, cursor);
  const anchor = ANCHOR_RE.exec(before);
  if (anchor) {
    const query = anchor[1]!;
    return { kind: 'anchor', from: cursor - query.length, to: cursor, query };
  }
  const note = FOOTNOTE_RE.exec(before);
  // `[^x]:` at the start of a line is a new definition, not a reference.
  if (note && note.index > 0) {
    const query = note[1]!;
    return { kind: 'footnote', from: cursor - query.length, to: cursor, query };
  }
  const cite = CITATION_RE.exec(before);
  if (cite) {
    const query = cite[1]!;
    return { kind: 'citation', from: cursor - query.length, to: cursor, query };
  }
  return null;
};

/** Labels of the footnotes the document defines, in order, once each. */
export const footnoteLabels = (source: string): string[] => [
  ...new Set(Array.from(source.matchAll(DEFINITION_RE), (m) => m[1]!)),
];

/** Academic: bibliography keys and `{#fig:…}`-style labels a `@` can point at. */
export const citationTargets = (source: string): Completion[] => {
  const sources = Array.from(source.matchAll(BIBLIOGRAPHY_RE), (m) => parseBibtex(m[1]!)).flat();
  const labels = Array.from(source.matchAll(LABEL_RE), (m) => ({
    label: m[1]!,
    value: m[1]!,
    detail: LABEL_KINDS[m[2]!]!,
  }));
  const all = [
    ...sources.map((e) => ({ label: e.key, value: e.key, detail: narrativeName(e) })),
    ...labels,
  ];
  return all.filter((c, i) => all.findIndex((o) => o.value === c.value) === i);
};

const rank = (query: string, ...fields: string[]): number => {
  const q = query.toLowerCase();
  const lower = fields.map((f) => f.toLowerCase());
  if (lower.some((f) => f.startsWith(q))) return 0;
  if (lower.some((f) => f.includes(q))) return 1;
  return -1;
};

export const suggest = (
  ctx: CompletionContext,
  headings: readonly DocHeading[],
  labels: readonly string[],
  citations: readonly Completion[] = [],
): Completion[] => {
  const candidates: readonly Completion[] = {
    anchor: () => headings.map((h) => ({ label: h.text, value: h.slug, detail: `#${h.slug}` })),
    footnote: () => labels.map((l) => ({ label: l, value: l, detail: `[^${l}]` })),
    citation: () => citations,
  }[ctx.kind]();
  return candidates
    .map((c) => ({ c, score: rank(ctx.query, c.value, c.label) }))
    .filter(({ c, score }) => score >= 0 && c.value !== ctx.query)
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ c }) => c);
};

/** Insert the choice, closing the reference (`)` / `]`) unless it already is; `@key` needs no closer. */
export const applyCompletion = (
  value: string,
  ctx: CompletionContext,
  choice: Completion,
): EditResult => {
  const closer = { anchor: ')', footnote: ']', citation: '' }[ctx.kind];
  const after = value.slice(ctx.to);
  const closed = !closer || after.startsWith(closer);
  const insert = choice.value + (closed ? '' : closer);
  const cursor = ctx.from + insert.length + (closer && closed ? 1 : 0);
  return {
    value: value.slice(0, ctx.from) + insert + after,
    start: cursor,
    end: cursor,
  };
};
