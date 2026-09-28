import type MarkdownIt from 'markdown-it';
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import type { MathBlockMeta } from './katex.ts';

/**
 * pandoc-crossref's labels, numbered in document order:
 *
 *   ![Caption](plot.png){#fig:plot}        → Figure 1: Caption
 *   : Caption {#tbl:results}  (after a table) → Table 1: Caption
 *   $$ E = mc^2 $$ {#eq:energy}            → equation tagged (1)
 *
 * `@fig:plot` / `[@eq:energy]` (see pandocCite.ts) then resolve against
 * `env.crossRefs`.
 */

export type RefKind = 'fig' | 'tbl' | 'eq';

export interface RefTarget {
  kind: RefKind;
  number: number;
}

export interface CrossRefEnv {
  crossRefs?: Map<string, RefTarget>;
}

const REF_NAMES: Record<RefKind, string> = { fig: 'Figure', tbl: 'Table', eq: 'Equation' };

/** How a reference to a target reads: "Figure 2", "Table 1", "Equation (3)". */
export const refText = (target: RefTarget): string =>
  target.kind === 'eq'
    ? `${REF_NAMES.eq} (${target.number})`
    : `${REF_NAMES[target.kind]} ${target.number}`;

export const isRefKey = (key: string): boolean => /^(fig|tbl|eq):/.test(key);

const FIGURE_LABEL_RE = /^\s*\{#(fig:[\w.:-]+)\}\s*$/;
const TABLE_CAPTION_RE = /^(?:Table)?:\s+/;
const TABLE_LABEL_RE = /\s*\{#(tbl:[\w.:-]+)\}\s*$/;

/** `![alt](src){#fig:x}` alone in a paragraph: the label, else null. */
const figureLabel = (inline: Token): string | null => {
  const [image, ...rest] = inline.children!;
  if (image!.type !== 'image') return null;
  const tail = rest.map((c) => (c.type === 'text' ? c.content : '\0')).join('');
  return FIGURE_LABEL_RE.exec(tail)?.[1] ?? null;
};

/** The paragraph after a table, if it is a `: caption` / `Table: caption` line. */
const isTableCaption = (tokens: Token[], close: number): boolean => {
  const open = tokens[close + 1];
  const first = tokens[close + 2]?.children?.[0];
  return (
    open?.type === 'paragraph_open' &&
    open.level === tokens[close]!.level &&
    first?.type === 'text' &&
    TABLE_CAPTION_RE.test(first.content)
  );
};

type Numberer = (label: string) => number;

/** Move a `: caption` paragraph inside the table (just after `table_open`) as its <caption>. */
const captionTable = (state: StateCore, open: number, close: number, number: Numberer): void => {
  const tokens = state.tokens;
  const [, inline] = tokens.splice(close + 1, 3) as [Token, Token, Token];
  const children = inline.children!;
  const first = children[0]!;
  first.content = first.content.replace(TABLE_CAPTION_RE, '');
  const last = children.at(-1)!;
  const label = last.type === 'text' ? TABLE_LABEL_RE.exec(last.content) : null;
  if (label) {
    last.content = last.content.slice(0, label.index);
    tokens[open]!.attrSet('id', label[1]!);
    const prefix = new state.Token('xref_label', '', 0);
    prefix.content = `Table ${number(label[1]!)}: `;
    children.unshift(prefix);
  }
  const captionOpen = new state.Token('table_caption_open', 'caption', 1);
  const captionClose = new state.Token('table_caption_close', 'caption', -1);
  tokens.splice(open + 1, 0, captionOpen, inline, captionClose);
};

/** Turn a labelled lone-image paragraph into <figure> + numbered <figcaption>. */
const figure = (state: StateCore, i: number, label: string, number: Numberer): void => {
  const [open, inline, close] = state.tokens.slice(i, i + 3) as [Token, Token, Token];
  const image = inline.children!.find((c) => c.type === 'image')!;
  const caption = new state.Token('xref_caption', 'figcaption', 0);
  caption.content = `Figure ${number(label)}: ${image.content}`;
  caption.children = image.children;
  inline.children = [image, caption];
  open.tag = 'figure';
  open.attrSet('id', label);
  open.attrSet('class', 'figure');
  close.tag = 'figure';
};

export const pluginCrossRef = (md: MarkdownIt): void => {
  md.core.ruler.after('inline', 'cross_refs', (state) => {
    // parseInline (e.g. the task-list plugin re-parsing an item) shares env;
    // numbering is the whole document's business.
    if (state.inlineMode) return;
    const tokens = state.tokens;
    const targets = new Map<string, RefTarget>();
    const counts: Record<RefKind, number> = { fig: 0, tbl: 0, eq: 0 };
    const number: Numberer = (label) => {
      const kind = label.slice(0, label.indexOf(':')) as RefKind;
      const n = ++counts[kind];
      if (!targets.has(label)) targets.set(label, { kind, number: n });
      return n;
    };
    let tableOpen = -1;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      if (token.type === 'math_block') {
        const meta = token.meta as MathBlockMeta;
        if (meta.label) meta.number = number(meta.label);
      } else if (token.type === 'table_open') {
        tableOpen = i;
      } else if (token.type === 'table_close' && isTableCaption(tokens, i)) {
        captionTable(state, tableOpen, i, number);
        i += 3;
      } else if (token.type === 'paragraph_open') {
        const label = figureLabel(tokens[i + 1]!);
        if (label) figure(state, i, label, number);
      }
    }
    (state.env as CrossRefEnv).crossRefs = targets;
  });

  md.renderer.rules.xref_label = (tokens, idx) =>
    `<span class="xref-label">${md.utils.escapeHtml(tokens[idx]!.content.trimEnd())}</span> `;

  md.renderer.rules.xref_caption = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!;
    const label = token.content.slice(0, token.content.indexOf(':') + 1);
    return `<figcaption><span class="xref-label">${md.utils.escapeHtml(label)}</span> ${self.renderInline(token.children!, options, env)}</figcaption>`;
  };
};
