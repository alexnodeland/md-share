import type Token from 'markdown-it/lib/token.mjs';
import { narrativeName, type Segment } from './bibtex.ts';
import { isRefKey } from './plugins/crossRef.ts';
import type { MathBlockMeta } from './plugins/katex.ts';
import type { BibliographyMeta, CitationMeta, ResolvedItem } from './plugins/pandocCite.ts';

/**
 * A standalone LaTeX document from markdown-it tokens (any flavor; Academic
 * features map to their LaTeX equivalents: \cite, \ref, figure and table
 * floats, labelled equations, thebibliography). Compiles with pdflatex.
 */

export interface LatexOptions {
  /** Frontmatter: `title`, `author`, `date` feed \maketitle. */
  meta: Record<string, string>;
}

const SPECIALS: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  '#': '\\#',
  $: '\\$',
  '%': '\\%',
  '&': '\\&',
  _: '\\_',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

// Symbols pdflatex's utf8 support lacks, as commands every engine has.
const SYMBOLS: Record<string, string> = {
  '✓': '\\checkmark{}',
  '✔': '\\checkmark{}',
  '✗': '\\ensuremath{\\times}',
  '✘': '\\ensuremath{\\times}',
  '☐': '\\ensuremath{\\square}',
  '☒': '\\ensuremath{\\boxtimes}',
  '→': '\\ensuremath{\\rightarrow}',
  '←': '\\ensuremath{\\leftarrow}',
  '↔': '\\ensuremath{\\leftrightarrow}',
  '⇒': '\\ensuremath{\\Rightarrow}',
  '↑': '\\ensuremath{\\uparrow}',
  '↓': '\\ensuremath{\\downarrow}',
  '≤': '\\ensuremath{\\leq}',
  '≥': '\\ensuremath{\\geq}',
  '≠': '\\ensuremath{\\neq}',
  '≈': '\\ensuremath{\\approx}',
  '∞': '\\ensuremath{\\infty}',
  '⌘': '\\textsf{Cmd}',
  '⌥': '\\textsf{Opt}',
  '⇧': '\\textsf{Shift}',
  '⌃': '\\textsf{Ctrl}',
};
const SYMBOL_RE = new RegExp(`[${Object.keys(SYMBOLS).join('')}]`, 'gu');
// Emoji have no glyphs in LaTeX's fonts; pdflatex would stop on them.
const PICTOGRAPH_RE = /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D/gu;

export const escapeLatex = (text: string): string =>
  text
    .replace(/[\\{}#$%&_~^]/g, (c) => SPECIALS[c]!)
    .replace(SYMBOL_RE, (c) => SYMBOLS[c]!)
    .replace(PICTOGRAPH_RE, '');

/** URLs keep their characters, except the few that break \href / \url. */
const escapeUrl = (url: string): string => url.replace(/[\\{}#%]/g, (c) => `\\${c}`);

const SECTIONS = ['section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];
const REF_COMMANDS: Record<string, [string, string]> = {
  fig: ['Figure', 'ref'],
  tbl: ['Table', 'ref'],
  eq: ['Equation', 'eqref'],
};

const PREAMBLE = String.raw`\documentclass{article}
\usepackage{iftex}
\ifPDFTeX
  \usepackage[utf8]{inputenc}
  \usepackage[T1]{fontenc}
\else
  \usepackage{fontspec}
\fi
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage[normalem]{ulem}
\usepackage{xcolor,soul}
\usepackage[colorlinks=true,allcolors=blue!50!black]{hyperref}`;

interface Context {
  footnotes: Map<number, string>;
}

const segmentsLatex = (segments: readonly Segment[]): string =>
  segments
    .map((s) => {
      if (s.link) return `\\url{${escapeUrl(s.link)}}`;
      return s.italic ? `\\emph{${escapeLatex(s.text)}}` : escapeLatex(s.text);
    })
    .join('');

const refLatex = (key: string, target: { kind: string }): string => {
  const [name, command] = REF_COMMANDS[target.kind]!;
  return `${name}~\\${command}{${key}}`;
};

const citeItem = (item: ResolvedItem): string => {
  const prefix = item.prefix ? `${escapeLatex(item.prefix)} ` : '';
  if (item.kind === 'ref') return prefix + refLatex(item.key, item.target);
  if (item.kind === 'missing') return `${prefix}\\textbf{?${escapeLatex(item.key)}}`;
  const suffix = item.suffix ? `[${escapeLatex(item.suffix)}]` : '';
  return `${prefix}\\cite${suffix}{${item.key}}`;
};

const citationLatex = (meta: CitationMeta): string => {
  const items = meta.resolved!;
  if (meta.narrative) {
    const item = items[0]!;
    if (item.kind === 'source')
      return `${escapeLatex(narrativeName(item.entry))}~\\cite{${item.key}}`;
    if (item.kind === 'ref') return refLatex(item.key, item.target);
    // An unknown @name is just text; an unknown @fig:x is a broken reference.
    return isRefKey(item.key) ? `\\textbf{?${escapeLatex(item.key)}}` : escapeLatex(`@${item.key}`);
  }
  // [@a; @b] with nothing around the keys is one \cite{a,b}: "[1, 2]".
  if (items.every((i) => i.kind === 'source' && !i.prefix && !i.suffix)) {
    return `\\cite{${items.map((i) => i.key).join(',')}}`;
  }
  return items.map(citeItem).join(', ');
};

const imageLatex = (token: Token): string => {
  const src = token.attrGet('src')!;
  // LaTeX can only include local files; say what was there otherwise.
  if (/^(data:|[a-z]+:\/\/)/i.test(src)) return `\\emph{[Image: ${escapeLatex(token.content)}]}`;
  return `\\includegraphics[width=\\linewidth,height=0.45\\textheight,keepaspectratio]{${escapeUrl(src)}}`;
};

const linkOpen = (token: Token): string => {
  const href = token.attrGet('href')!;
  if (href.startsWith('#')) return `\\hyperref[${href.slice(1)}]{`;
  return `\\href{${escapeUrl(href)}}{`;
};

const INLINE: Record<string, (t: Token, ctx: Context) => string> = {
  text: (t) => escapeLatex(t.content),
  softbreak: () => '\n',
  hardbreak: () => '\\\\\n',
  strong_open: () => '\\textbf{',
  em_open: () => '\\emph{',
  s_open: () => '\\sout{',
  mark_open: () => '\\hl{',
  code_inline: (t) => `\\texttt{${escapeLatex(t.content)}}`,
  math_inline: (t) => `$${t.content}$`,
  link_open: linkOpen,
  image: imageLatex,
  footnote_ref: (t, ctx) => `\\footnote{${ctx.footnotes.get((t.meta as { id: number }).id)}}`,
  citation: (t) => citationLatex(t.meta as CitationMeta),
  obsidian_tag: (t) => escapeLatex(`#${t.content}`),
  atl_mention: (t) => escapeLatex(`@${t.content}`),
  atl_status: (t) => `\\textbf{${escapeLatex((t.meta as { title: string }).title)}}`,
  html_inline: () => '',
  // "Table 1:" — \caption numbers the float itself.
  xref_label: () => '',
};
for (const close of ['strong_close', 'em_close', 's_close', 'mark_close', 'link_close']) {
  INLINE[close] = () => '}';
}

export const inlineLatex = (children: readonly Token[], ctx: Context): string =>
  children
    .map((child) => {
      const handler = INLINE[child.type];
      // Wikilinks and other plugin text carry their words in `content`.
      return handler ? handler(child, ctx) : escapeLatex(child.content);
    })
    .join('');

const tableLatex = (tokens: readonly Token[], start: number, ctx: Context): [string, number] => {
  const rows: string[][] = [];
  const aligns: string[] = [];
  let caption = '';
  let i = start;
  for (; tokens[i]!.type !== 'table_close'; i++) {
    const t = tokens[i]!;
    if (t.type === 'tr_open') rows.push([]);
    if (t.type === 'th_open') {
      const align = /text-align:(\w+)/.exec(t.attrGet('style') ?? '')?.[1];
      aligns.push(align === 'center' ? 'c' : align === 'right' ? 'r' : 'l');
    }
    if (t.type === 'inline') {
      const text = inlineLatex(t.children!, ctx);
      if (tokens[i - 1]!.type === 'table_caption_open') caption = text;
      else rows.at(-1)!.push(text);
    }
  }
  const id = tokens[start]!.attrGet('id');
  const [header = [], ...body] = rows;
  const line = (cells: string[]) => `${cells.join(' & ')} \\\\`;
  const out = [
    '\\begin{table}[htbp]',
    '\\centering',
    ...(caption ? [`\\caption{${caption}}${id ? `\\label{${id}}` : ''}`] : []),
    `\\begin{tabular}{${aligns.join('')}}`,
    '\\hline',
    line(header),
    '\\hline',
    ...body.map(line),
    '\\hline',
    '\\end{tabular}',
    '\\end{table}',
  ];
  return [`${out.join('\n')}\n\n`, i];
};

const verbatim = (text: string) =>
  `\\begin{verbatim}\n${text.replace(/\n$/, '')}\n\\end{verbatim}\n\n`;

const bibliographyLatex = ({ items }: BibliographyMeta): string => {
  if (items.length === 0) return '';
  const entries = items.map((i) => `\\bibitem{${i.entry.key}} ${segmentsLatex(i.segments)}`);
  // The document's own heading introduces the list; suppress thebibliography's.
  return [
    '\\begingroup',
    '\\renewcommand{\\section}[2]{}',
    `\\begin{thebibliography}{${items.length}}`,
    ...entries,
    '\\end{thebibliography}',
    '\\endgroup',
    '',
    '',
  ].join('\n');
};

type BlockHandler = (t: Token, i: number) => string | [string, number];

const blockHandlers = (
  tokens: readonly Token[],
  ctx: Context,
  section: (level: number) => string,
): Record<string, BlockHandler> => ({
  heading_open: (t, i) => {
    const id = t.attrGet('id');
    const label = id ? `\\label{${id}}` : '';
    const text = inlineLatex(tokens[i + 1]!.children!, ctx);
    return [`\\${section(Number(t.tag.slice(1)))}{${text}}${label}\n\n`, i + 2];
  },
  paragraph_open: (t, i) => {
    const children = tokens[i + 1]!.children!;
    if (t.tag === 'figure') {
      const [image, caption] = children as [Token, Token];
      const body = [
        '\\begin{figure}[htbp]',
        '\\centering',
        imageLatex(image),
        `\\caption{${inlineLatex(caption.children!, ctx)}}\\label{${t.attrGet('id')}}`,
        '\\end{figure}',
      ];
      return [`${body.join('\n')}\n\n`, i + 2];
    }
    // Tight list items: one line each, no blank line between.
    const end = t.hidden ? '\n' : '\n\n';
    return [inlineLatex(children, ctx) + end, i + 2];
  },
  bullet_list_open: () => '\\begin{itemize}\n',
  bullet_list_close: () => '\\end{itemize}\n\n',
  ordered_list_open: (t) => {
    const start = Number(t.attrGet('start') ?? 1);
    return `\\begin{enumerate}\n${start === 1 ? '' : `\\setcounter{enumi}{${start - 1}}\n`}`;
  },
  ordered_list_close: () => '\\end{enumerate}\n\n',
  list_item_open: (t) => {
    const checked = (t.meta as { checked?: boolean } | null)?.checked;
    if (checked === undefined) return '\\item ';
    return checked ? '\\item[$\\boxtimes$] ' : '\\item[$\\square$] ';
  },
  blockquote_open: (t) => {
    const meta = t.meta as { callout?: true; title: string } | null;
    const title = meta?.callout ? `\\textbf{${escapeLatex(meta.title)}}\\par\n` : '';
    return `\\begin{quote}\n${title}`;
  },
  blockquote_close: () => '\\end{quote}\n\n',
  atl_panel_open: (t) => {
    const { type, title } = t.meta as { type: string; title: string };
    return `\\begin{quote}\n\\textbf{${escapeLatex(title || type)}}\\par\n`;
  },
  atl_expand_open: (t) =>
    `\\begin{quote}\n\\textbf{${escapeLatex((t.meta as { title: string }).title || 'Details')}}\\par\n`,
  atl_panel_close: () => '\\end{quote}\n\n',
  atl_expand_close: () => '\\end{quote}\n\n',
  dt_open: (_t, i) => [`\\item[${inlineLatex(tokens[i + 1]!.children!, ctx)}] `, i + 2],
  dl_open: () => '\\begin{description}\n',
  dl_close: () => '\\end{description}\n\n',
  fence: (t) => {
    const lang = t.info.trim().split(/\s+/, 1)[0];
    const note =
      lang === 'mermaid' ? '% Mermaid diagram source (export it as PNG from md-share)\n' : '';
    return note + verbatim(t.content);
  },
  code_block: (t) => verbatim(t.content),
  math_block: (t) => {
    const { label } = t.meta as MathBlockMeta;
    // KaTeX breaks lines at a top-level \\; LaTeX needs gather for that.
    const env = /\\\\/.test(t.content) && !t.content.includes('\\begin{') ? 'gather' : 'equation';
    if (label) return `\\begin{${env}}\\label{${label}}\n${t.content}\n\\end{${env}}\n\n`;
    return `\\begin{${env}*}\n${t.content}\n\\end{${env}*}\n\n`;
  },
  hr: () => '\\par\\noindent\\rule{\\linewidth}{0.4pt}\n\n',
  html_block: (t) => `${t.content.replace(/\n$/, '').replace(/^/gm, '% ')}\n\n`,
  table_open: (_t, i) => tableLatex(tokens, i, ctx),
  bibliography: (t) => bibliographyLatex(t.meta as BibliographyMeta),
});

/** Footnote bodies, rendered inline, by markdown-it's id. */
const collectFootnotes = (tokens: readonly Token[]): Map<number, string> => {
  const notes = new Map<number, string>();
  const ctx: Context = { footnotes: notes };
  let id: number | null = null;
  let parts: string[] = [];
  for (const t of tokens) {
    if (t.type === 'footnote_open') {
      id = (t.meta as { id: number }).id;
      parts = [];
    } else if (t.type === 'footnote_close') {
      notes.set(id!, parts.join(' '));
      id = null;
    } else if (id !== null && t.type === 'inline') {
      parts.push(inlineLatex(t.children!, ctx));
    }
  }
  return notes;
};

const titleBlock = (meta: Record<string, string>, title: string | null): string => {
  if (!title) return '';
  const lines = [`\\title{${title}}`];
  lines.push(`\\author{${escapeLatex(meta.author ?? '')}}`);
  if (meta.date) lines.push(`\\date{${escapeLatex(meta.date)}}`);
  return `${lines.join('\n')}\n`;
};

export const toLatex = (tokens: readonly Token[], options: LatexOptions): string => {
  const ctx: Context = { footnotes: collectFootnotes(tokens) };
  let body = tokens;
  let title = options.meta.title ? escapeLatex(options.meta.title) : null;
  // No frontmatter title: a leading # heading is the title.
  if (!title && body[0]?.type === 'heading_open' && body[0].tag === 'h1') {
    title = inlineLatex(body[1]!.children!, ctx);
    body = body.slice(3);
  }
  const levels = body.filter((t) => t.type === 'heading_open').map((t) => Number(t.tag.slice(1)));
  const top = Math.min(...levels);
  const section = (level: number) => SECTIONS[Math.min(level - top, SECTIONS.length - 1)]!;
  const handlers = blockHandlers(body, ctx, section);

  let out = '';
  for (let i = 0; i < body.length; i++) {
    const t = body[i]!;
    if (t.type === 'footnote_block_open') break; // bodies went into \footnote{}
    const result = handlers[t.type]?.(t, i) ?? '';
    if (typeof result === 'string') out += result;
    else [out, i] = [out + result[0], result[1]];
  }

  return [
    '% Generated by md-share. Compiles with pdflatex; use lualatex or xelatex for non-Latin scripts.',
    PREAMBLE,
    '',
    titleBlock(options.meta, title),
    '\\begin{document}',
    ...(title ? ['\\maketitle', ''] : []),
    out.trimEnd(),
    '',
    '\\end{document}',
    '',
  ].join('\n');
};
