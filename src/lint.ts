import type Token from 'markdown-it/lib/token.mjs';
import { inlineText } from './plugins/anchors.ts';
import type { DocHeading } from './types.ts';

export type LintRule =
  | 'heading-skip'
  | 'heading-empty'
  | 'image-alt'
  | 'link-empty'
  | 'link-anchor'
  | 'footnote-undefined'
  | 'fence-unclosed';

export interface Diagnostic {
  rule: LintRule;
  /** 1-based line in the editor (frontmatter included). */
  line: number;
  message: string;
}

export interface LintContext {
  /** Raw body source (after frontmatter), for checks tokens can't answer. */
  body: string;
  /** Lines stripped before `body` (frontmatter). */
  lineOffset: number;
  /** The outline the heading-anchor rule recorded while parsing. */
  headings: readonly DocHeading[];
  /** Whether this flavor parses `[^x]` footnotes at all. */
  footnotes: boolean;
}

const FOOTNOTE_REF_RE = /\[\^([^\]\s]+)\]/g;

const lineOf = (token: Token, ctx: LintContext): number =>
  (token.map?.[0] ?? 0) + ctx.lineOffset + 1;

type ChildCheck = (
  child: Token,
  next: Token | undefined,
  ctx: LintContext,
  ids: ReadonlySet<string>,
) => Omit<Diagnostic, 'line'> | Omit<Diagnostic, 'line'>[] | null;

const imageAlt: ChildCheck = (child) =>
  child.type === 'image' && !child.content.trim()
    ? { rule: 'image-alt', message: 'Image has no alt text — screen readers will skip it' }
    : null;

const links: ChildCheck = (child, next, _ctx, ids) => {
  if (child.type !== 'link_open') return null;
  const href = child.attrGet('href')!;
  if (!href) return { rule: 'link-empty', message: 'Link has no destination' };
  if (next?.type === 'link_close') return { rule: 'link-empty', message: 'Link has no text' };
  if (!href.startsWith('#') || href.length === 1) return null;
  const id = decodeURIComponent(href.slice(1));
  return ids.has(id) ? null : { rule: 'link-anchor', message: `Link to #${id} matches no heading` };
};

// markdown-it-footnote leaves an undefined [^x] as literal text.
const footnotes: ChildCheck = (child, _next, ctx) =>
  ctx.footnotes && child.type === 'text'
    ? Array.from(child.content.matchAll(FOOTNOTE_REF_RE), (m) => ({
        rule: 'footnote-undefined' as const,
        message: `Footnote [^${m[1]}] has no definition`,
      }))
    : null;

const CHILD_CHECKS = [imageAlt, links, footnotes];

const inlineChecks = (inline: Token, ctx: LintContext, ids: ReadonlySet<string>): Diagnostic[] => {
  const line = lineOf(inline, ctx);
  const children = inline.children!;
  return children.flatMap((child, i) =>
    CHILD_CHECKS.flatMap((check) => check(child, children[i + 1], ctx, ids) ?? []).map((d) => ({
      ...d,
      line,
    })),
  );
};

/** A fence that runs to the end of the document swallows everything after it. */
const unclosedFence = (token: Token, ctx: LintContext): Diagnostic | null => {
  const lines = ctx.body.split('\n');
  const [start, end] = token.map!;
  // Fence tokens also come from {code} macros; only real ``` / ~~~ fences can dangle.
  if (!lines[start]!.trim().startsWith(token.markup)) return null;
  const closer = lines[end - 1]!.trim();
  const closed =
    end - start > 1 && closer.startsWith(token.markup) && closer.replace(/[`~]/g, '') === '';
  return closed
    ? null
    : {
        rule: 'fence-unclosed',
        line: lineOf(token, ctx),
        message: 'Code fence is never closed — the rest of the document is code',
      };
};

/** Problems a reader would hit: broken navigation, missing alt text, swallowed content. */
export const lintDocument = (tokens: readonly Token[], ctx: LintContext): Diagnostic[] => {
  const ids = new Set(ctx.headings.map((h) => h.slug));
  // Footnote ids render as fn1, fnref1…; they are valid targets too.
  for (const t of tokens)
    if (t.type === 'footnote_open') ids.add(`fn${(t.meta as { id: number }).id + 1}`);
  const out: Diagnostic[] = [];
  let lastLevel = 0;
  tokens.forEach((token, i) => {
    if (token.type === 'heading_open') {
      const level = Number(token.tag.slice(1));
      if (lastLevel && level > lastLevel + 1) {
        out.push({
          rule: 'heading-skip',
          line: lineOf(token, ctx),
          message: `Heading jumps from h${lastLevel} to h${level} — screen-reader outlines expect h${lastLevel + 1}`,
        });
      }
      lastLevel = level;
      if (!inlineText(tokens[i + 1]!)) {
        out.push({ rule: 'heading-empty', line: lineOf(token, ctx), message: 'Heading is empty' });
      }
    }
    if (token.type === 'inline') out.push(...inlineChecks(token, ctx, ids));
    if (token.type === 'fence') {
      const d = unclosedFence(token, ctx);
      if (d) out.push(d);
    }
  });
  return out.sort((a, b) => a.line - b.line);
};

export const describeDiagnostics = (count: number): string =>
  count === 1 ? '1 issue' : `${count} issues`;
