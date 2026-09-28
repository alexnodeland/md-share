import type Token from 'markdown-it/lib/token.mjs';

/**
 * A format-neutral model of a rendered document, built from markdown-it's
 * token stream (so every flavor's plugins are already applied). Exporters
 * (DOCX today) render this instead of re-parsing Markdown or scraping HTML.
 */

export interface Marks {
  bold?: true;
  italic?: true;
  strike?: true;
  code?: true;
  highlight?: true;
  math?: true;
  link?: string;
}

export type Inline =
  | { type: 'text'; text: string; marks: Marks }
  | { type: 'break' }
  | { type: 'image'; src: string; alt: string }
  | { type: 'footnote'; id: number };

export interface ListInfo {
  /** Distinct per list, so each ordered list restarts its numbering. */
  id: number;
  ordered: boolean;
  level: number;
  start: number;
  checked: boolean | null;
}

/** Where a block sits: inside quotes, a callout/panel, or indented under a list item or definition. */
export interface Frame {
  quote: number;
  callout: string | null;
  /** Distinct per callout, so adjacent callouts of the same type stay separate. */
  calloutId: number | null;
  indent: number;
}

export type Block =
  | { type: 'heading'; level: number; content: Inline[] }
  | { type: 'paragraph'; content: Inline[]; list: ListInfo | null; frame: Frame }
  | { type: 'code'; text: string; language: string; frame: Frame }
  | { type: 'math'; tex: string }
  | { type: 'diagram'; source: string; index: number }
  | { type: 'table'; header: Inline[][]; rows: Inline[][][] }
  | { type: 'rule' };

export interface DocModel {
  blocks: Block[];
  /** Footnote bodies keyed by markdown-it's footnote id. */
  footnotes: Record<number, Block[]>;
}

type Flag = Exclude<keyof Marks, 'link'>;

const TOGGLES: Record<string, [Flag, boolean]> = {
  strong_open: ['bold', true],
  strong_close: ['bold', false],
  em_open: ['italic', true],
  em_close: ['italic', false],
  s_open: ['strike', true],
  s_close: ['strike', false],
  mark_open: ['highlight', true],
  mark_close: ['highlight', false],
};

/** Inline tokens → runs. `base` marks apply to every run (e.g. bold definition terms). */
export const buildInlines = (token: Token, base: Marks = {}): Inline[] => {
  const out: Inline[] = [];
  const marks: Marks = { ...base };
  const links: string[] = [];
  const text = (value: string, extra: Marks = {}) => {
    // markdown-it leaves empty text tokens around emphasis delimiters.
    if (!value) return;
    const link = links.at(-1);
    out.push({
      type: 'text',
      text: value,
      marks: { ...marks, ...extra, ...(link ? { link } : {}) },
    });
  };
  for (const child of token.children!) {
    const toggle = TOGGLES[child.type];
    if (toggle) {
      if (toggle[1]) marks[toggle[0]] = true;
      else delete marks[toggle[0]];
      continue;
    }
    switch (child.type) {
      case 'text':
        text(child.content);
        break;
      case 'code_inline':
        text(child.content, { code: true });
        break;
      case 'math_inline':
        text(child.content, { math: true });
        break;
      case 'softbreak':
        text(' ');
        break;
      case 'hardbreak':
        out.push({ type: 'break' });
        break;
      case 'link_open':
        links.push(child.attrGet('href')!);
        break;
      case 'link_close':
        links.pop();
        break;
      case 'image':
        out.push({ type: 'image', src: child.attrGet('src')!, alt: child.content });
        break;
      case 'footnote_ref':
        out.push({ type: 'footnote', id: (child.meta as { id: number }).id });
        break;
      case 'obsidian_tag':
        text(`#${child.content}`);
        break;
      case 'atl_mention':
        text(`@${child.content}`);
        break;
      case 'atl_status':
        text((child.meta as { title: string }).title, { bold: true });
        break;
      default:
        // Wikilinks and any other plugin text; raw HTML and footnote anchors carry none.
        if (child.content && child.type !== 'html_inline') text(child.content);
    }
  }
  return out;
};

export const buildDocModel = (tokens: readonly Token[]): DocModel => {
  const blocks: Block[] = [];
  const footnotes: Record<number, Block[]> = {};
  let out = blocks;
  const lists: { id: number; ordered: boolean; start: number; next: number }[] = [];
  const containers: ('quote' | 'callout')[] = [];
  const callouts: { type: string; id: number }[] = [];
  let calloutIds = 0;
  let pendingItem: ListInfo | null = null;
  let quote = 0;
  let definitions = 0;
  let listIds = 0;
  let diagrams = 0;
  let table: { header: Inline[][]; rows: Inline[][][]; row: Inline[][]; inHead: boolean } | null =
    null;

  const frame = (): Frame => {
    const callout = callouts.at(-1);
    return {
      quote,
      callout: callout?.type ?? null,
      calloutId: callout?.id ?? null,
      indent: lists.length + definitions,
    };
  };
  const paragraph = (content: Inline[], list: ListInfo | null = null) =>
    out.push({ type: 'paragraph', content, list, frame: frame() });
  const openCallout = (type: string, title: string) => {
    callouts.push({ type, id: calloutIds++ });
    paragraph([{ type: 'text', text: title, marks: { bold: true } }]);
  };
  const openList = (ordered: boolean, start: number) =>
    lists.push({ id: listIds++, ordered, start, next: start });

  // Each handler returns how many extra tokens it consumed.
  const handlers: Record<string, (t: Token, i: number) => number> = {
    heading_open: (t, i) => {
      out.push({
        type: 'heading',
        level: Number(t.tag.slice(1)),
        content: buildInlines(tokens[i + 1]!),
      });
      return 2;
    },
    paragraph_open: (_t, i) => {
      paragraph(buildInlines(tokens[i + 1]!), pendingItem);
      pendingItem = null;
      return 2;
    },
    dt_open: (_t, i) => {
      paragraph(buildInlines(tokens[i + 1]!, { bold: true }));
      return 2;
    },
    dd_open: () => {
      definitions++;
      return 0;
    },
    dd_close: () => {
      definitions--;
      return 0;
    },
    bullet_list_open: () => {
      openList(false, 1);
      return 0;
    },
    ordered_list_open: (t) => {
      openList(true, Number(t.attrGet('start') ?? 1));
      return 0;
    },
    bullet_list_close: () => {
      lists.pop();
      return 0;
    },
    ordered_list_close: () => {
      lists.pop();
      return 0;
    },
    list_item_open: (t) => {
      const list = lists.at(-1)!;
      const checked = (t.meta as { checked?: boolean } | null)?.checked;
      pendingItem = {
        id: list.id,
        ordered: list.ordered,
        level: lists.length - 1,
        start: list.next++,
        checked: typeof checked === 'boolean' ? checked : null,
      };
      return 0;
    },
    list_item_close: () => {
      pendingItem = null;
      return 0;
    },
    blockquote_open: (t) => {
      const meta = t.meta as { callout?: true; type: string; title: string } | null;
      if (meta?.callout) {
        containers.push('callout');
        openCallout(meta.type, meta.title);
      } else {
        containers.push('quote');
        quote++;
      }
      return 0;
    },
    blockquote_close: () => {
      if (containers.pop() === 'callout') callouts.pop();
      else quote--;
      return 0;
    },
    atl_panel_open: (t) => {
      const { type, title } = t.meta as { type: string; title: string };
      openCallout(type, title || type.charAt(0).toUpperCase() + type.slice(1));
      return 0;
    },
    atl_expand_open: (t) => {
      const { title } = t.meta as { title: string };
      openCallout('expand', title || 'Click to expand');
      return 0;
    },
    atl_panel_close: () => {
      callouts.pop();
      return 0;
    },
    atl_expand_close: () => {
      callouts.pop();
      return 0;
    },
    fence: (t) => {
      const language = t.info.trim().split(/\s+/, 1).join('');
      if (language === 'mermaid') {
        out.push({ type: 'diagram', source: t.content, index: diagrams++ });
      } else {
        out.push({ type: 'code', text: t.content.replace(/\n$/, ''), language, frame: frame() });
      }
      return 0;
    },
    code_block: (t) => {
      out.push({ type: 'code', text: t.content.replace(/\n$/, ''), language: '', frame: frame() });
      return 0;
    },
    math_block: (t) => {
      out.push({ type: 'math', tex: t.content });
      return 0;
    },
    hr: () => {
      out.push({ type: 'rule' });
      return 0;
    },
    html_block: (t) => {
      const text = t.content.replace(/<[^>]*>/g, '').trim();
      if (text) paragraph([{ type: 'text', text, marks: {} }]);
      return 0;
    },
    table_open: () => {
      table = { header: [], rows: [], row: [], inHead: false };
      return 0;
    },
    thead_open: () => {
      table!.inHead = true;
      return 0;
    },
    thead_close: () => {
      table!.inHead = false;
      return 0;
    },
    tr_open: () => {
      table!.row = [];
      return 0;
    },
    th_open: (_t, i) => {
      table!.row.push(buildInlines(tokens[i + 1]!));
      return 2;
    },
    td_open: (_t, i) => {
      table!.row.push(buildInlines(tokens[i + 1]!));
      return 2;
    },
    tr_close: () => {
      if (table!.inHead) table!.header = table!.row;
      else table!.rows.push(table!.row);
      return 0;
    },
    table_close: () => {
      const { header, rows } = table!;
      out.push({ type: 'table', header, rows });
      table = null;
      return 0;
    },
    footnote_open: (t) => {
      out = [];
      footnotes[(t.meta as { id: number }).id] = out;
      return 0;
    },
    footnote_close: () => {
      out = blocks;
      return 0;
    },
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    i += handlers[token.type]?.(token, i) ?? 0;
  }
  return { blocks, footnotes };
};

export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<string, Tone> = {
  note: 'info',
  info: 'info',
  abstract: 'info',
  summary: 'info',
  tldr: 'info',
  todo: 'info',
  tip: 'success',
  hint: 'success',
  success: 'success',
  check: 'success',
  done: 'success',
  warning: 'warning',
  caution: 'warning',
  attention: 'warning',
  question: 'warning',
  help: 'warning',
  faq: 'warning',
  danger: 'danger',
  error: 'danger',
  bug: 'danger',
  failure: 'danger',
  fail: 'danger',
  missing: 'danger',
};

/** Colour family for an Obsidian callout or Atlassian panel type (the same families the preview uses). */
export const calloutTone = (type: string): Tone => TONES[type] ?? 'neutral';
