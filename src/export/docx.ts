// Pure markdown → DOCX intermediate representation (IR).
//
// The adapter in `src/adapters/docxBuild.ts` materializes this IR through
// the `docx` npm package into a real Blob. Keeping it in a neutral IR means
// rule logic is unit-testable without spinning up `docx`'s document model.
//
// Design choice: prefer a flat sequence of block-level operations with
// inline runs. Nested blocks (lists-in-lists, quotes-in-quotes) are
// flattened by tracking depth on each block op. Complex nesting (a table
// inside a list) degrades to separate adjacent blocks — good enough for the
// common "writer → Word" flow and keeps the IR intelligible.

import type MarkdownIt from 'markdown-it';

// markdown-it's Token type lives under a subpath. Alias the parse() return
// element to keep the imports tidy.
type Token = ReturnType<MarkdownIt['parse']>[number];

export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  href?: string;
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type DocxOp =
  | { kind: 'heading'; level: HeadingLevel; runs: InlineRun[] }
  | { kind: 'paragraph'; runs: InlineRun[] }
  | { kind: 'list-item'; ordered: boolean; level: number; runs: InlineRun[] }
  | { kind: 'blockquote'; runs: InlineRun[] }
  | { kind: 'code-block'; content: string; lang?: string }
  | { kind: 'table'; headers: InlineRun[][]; rows: InlineRun[][][] }
  | { kind: 'hr' };

export interface DocxBuildInput {
  source: string;
  title: string;
}

// Walk a flat run of inline tokens and produce inline runs with decorations.
// markdown-it emits inline tokens as a children array on a single 'inline'
// token; this function is called with that array.
const renderInline = (children: Token[]): InlineRun[] => {
  const runs: InlineRun[] = [];
  const state = {
    bold: false,
    italic: false,
    strike: false,
    href: undefined as string | undefined,
  };
  for (const t of children) {
    switch (t.type) {
      case 'text':
        if (t.content) runs.push({ ...state, text: t.content });
        break;
      case 'strong_open':
        state.bold = true;
        break;
      case 'strong_close':
        state.bold = false;
        break;
      case 'em_open':
        state.italic = true;
        break;
      case 'em_close':
        state.italic = false;
        break;
      case 's_open':
        state.strike = true;
        break;
      case 's_close':
        state.strike = false;
        break;
      case 'link_open': {
        const hrefAttr = t.attrs?.find((a: [string, string]) => a[0] === 'href');
        state.href = hrefAttr?.[1];
        break;
      }
      case 'link_close':
        state.href = undefined;
        break;
      case 'code_inline':
        runs.push({ ...state, text: t.content, code: true });
        break;
      case 'softbreak':
        runs.push({ ...state, text: ' ' });
        break;
      case 'hardbreak':
        runs.push({ ...state, text: '\n' });
        break;
      case 'image':
        // No image-embedding yet; emit the alt text so it isn't silently
        // lost. An empty alt emits an empty run, which docx handles cleanly.
        runs.push({ ...state, text: t.content });
        break;
      default:
        // Unknown inline token — ignore rather than throw; lint already warns
        // on math/footnote gaps.
        break;
    }
  }
  return runs;
};

// markdown-it always emits exactly one `inline` token immediately after a
// `heading_open` or `paragraph_open`, and inline tokens always carry a
// non-null children array; assert the shape rather than carry defensive
// fallbacks coverage can't exercise.
const takeInline = (tokens: Token[], i: number): InlineRun[] =>
  renderInline((tokens[i] as Token).children as Token[]);

// Collect every inline run between matching open/close at a given level.
// Returns concatenated runs from all inline tokens inside the block.
const collectInlineBetween = (
  tokens: Token[],
  startIdx: number,
  closeType: string,
  level: number,
): { runs: InlineRun[]; endIdx: number } => {
  const runs: InlineRun[] = [];
  let i = startIdx;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.type === closeType && t.level === level) return { runs, endIdx: i };
    if (t.type === 'inline') runs.push(...renderInline(t.children as Token[]));
    i += 1;
  }
  return { runs, endIdx: tokens.length };
};

// Parse one table from tokens starting at `table_open`. Returns the table op
// and the index of the matching `table_close`.
const parseTable = (tokens: Token[], startIdx: number): { op: DocxOp; endIdx: number } => {
  const headers: InlineRun[][] = [];
  const rows: InlineRun[][][] = [];
  let currentRow: InlineRun[][] = [];
  let inHead = false;
  let i = startIdx + 1;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.type === 'table_close') return { op: { kind: 'table', headers, rows }, endIdx: i };
    if (t.type === 'thead_open') inHead = true;
    else if (t.type === 'thead_close') inHead = false;
    else if (t.type === 'tr_open') currentRow = [];
    else if (t.type === 'tr_close') {
      if (inHead) headers.push(...currentRow);
      else rows.push(currentRow);
    } else if (t.type === 'th_open' || t.type === 'td_open') {
      // markdown-it always emits `inline` immediately after a cell_open.
      const inline = tokens[i + 1] as Token;
      currentRow.push(renderInline(inline.children as Token[]));
      i += 2; // skip inline + cell_close
    }
    i += 1;
  }
  return { op: { kind: 'table', headers, rows }, endIdx: tokens.length };
};

export const buildDocxOps = (source: string, md: MarkdownIt): DocxOp[] => {
  const tokens = md.parse(source, {});
  const ops: DocxOp[] = [];
  const listStack: Array<{ ordered: boolean }> = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    switch (t.type) {
      case 'heading_open': {
        const level = Number(t.tag.slice(1)) as HeadingLevel;
        ops.push({ kind: 'heading', level, runs: takeInline(tokens, i + 1) });
        i += 3; // heading_open + inline + heading_close
        continue;
      }
      case 'paragraph_open': {
        if (listStack.length > 0) {
          // Inline content becomes part of the surrounding list-item.
          const runs = takeInline(tokens, i + 1);
          const top = listStack[listStack.length - 1]!;
          ops.push({
            kind: 'list-item',
            ordered: top.ordered,
            level: listStack.length - 1,
            runs,
          });
        } else {
          ops.push({ kind: 'paragraph', runs: takeInline(tokens, i + 1) });
        }
        i += 3;
        continue;
      }
      case 'bullet_list_open':
        listStack.push({ ordered: false });
        break;
      case 'ordered_list_open':
        listStack.push({ ordered: true });
        break;
      case 'bullet_list_close':
      case 'ordered_list_close':
        listStack.pop();
        break;
      case 'blockquote_open': {
        const { runs, endIdx } = collectInlineBetween(tokens, i + 1, 'blockquote_close', t.level);
        ops.push({ kind: 'blockquote', runs });
        i = endIdx;
        break;
      }
      case 'fence':
      case 'code_block': {
        const lang = t.info?.trim() || undefined;
        ops.push({
          kind: 'code-block',
          content: t.content.replace(/\n$/, ''),
          ...(lang ? { lang } : {}),
        });
        break;
      }
      case 'hr':
        ops.push({ kind: 'hr' });
        break;
      case 'table_open': {
        const { op, endIdx } = parseTable(tokens, i);
        ops.push(op);
        i = endIdx;
        break;
      }
      default:
        // Unhandled top-level tokens (footnote_block, math, etc.) are skipped
        // silently — lint flags missing-footnote and unbalanced-math.
        break;
    }
    i += 1;
  }
  return ops;
};
