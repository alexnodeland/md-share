import type { EditResult } from './editorCommands.ts';
import type { DocHeading } from './types.ts';

export type CompletionKind = 'anchor' | 'footnote';

/** The partial reference the cursor sits at the end of: `](#par` or `[^par`. */
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
  return null;
};

/** Labels of the footnotes the document defines, in order, once each. */
export const footnoteLabels = (source: string): string[] => [
  ...new Set(Array.from(source.matchAll(DEFINITION_RE), (m) => m[1]!)),
];

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
): Completion[] => {
  const candidates: Completion[] =
    ctx.kind === 'anchor'
      ? headings.map((h) => ({ label: h.text, value: h.slug, detail: `#${h.slug}` }))
      : labels.map((l) => ({ label: l, value: l, detail: `[^${l}]` }));
  return candidates
    .map((c) => ({ c, score: rank(ctx.query, c.value, c.label) }))
    .filter(({ c, score }) => score >= 0 && c.value !== ctx.query)
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ c }) => c);
};

/** Insert the choice, closing the reference (`)` / `]`) unless it already is. */
export const applyCompletion = (
  value: string,
  ctx: CompletionContext,
  choice: Completion,
): EditResult => {
  const closer = ctx.kind === 'anchor' ? ')' : ']';
  const after = value.slice(ctx.to);
  const insert = choice.value + (after.startsWith(closer) ? '' : closer);
  const cursor = ctx.from + insert.length + (after.startsWith(closer) ? 1 : 0);
  return {
    value: value.slice(0, ctx.from) + insert + after,
    start: cursor,
    end: cursor,
  };
};
