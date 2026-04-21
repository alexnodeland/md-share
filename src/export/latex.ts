import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

const PREAMBLE = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{booktabs}
\\begin{document}
`;
const POSTAMBLE = '\\end{document}\n';

const HEADING_COMMAND: Record<string, string> = {
  h1: 'section',
  h2: 'subsection',
  h3: 'subsubsection',
  h4: 'paragraph',
};

const KIND_WORD: Record<string, string> = {
  fig: 'Figure',
  tbl: 'Table',
  eq: 'Equation',
};

// LaTeX special chars; backslash becomes \textbackslash{} so shell-escape cannot execute.
export const escapeLatex = (s: string): string => {
  let out = '';
  for (const ch of s) {
    switch (ch) {
      case '\\':
        out += '\\textbackslash{}';
        break;
      case '&':
      case '%':
      case '$':
      case '#':
      case '_':
      case '{':
      case '}':
        out += `\\${ch}`;
        break;
      case '~':
        out += '\\textasciitilde{}';
        break;
      case '^':
        out += '\\textasciicircum{}';
        break;
      default:
        out += ch;
    }
  }
  return out;
};

const escapeVerb = (s: string): string => s.replace(/\|/g, '');

const getAttr = (token: Token, name: string): string | undefined =>
  token.attrs?.find(([k]) => k === name)?.[1];

interface TableState {
  inHeader: boolean;
  cols: number;
  row: string[];
}

interface Context {
  unknown: Set<string>;
  tableState: TableState | null;
}

// markdown-it emits inline tokens with non-null children (possibly empty).
const renderInline = (children: Token[], ctx: Context): string => {
  let out = '';
  for (const t of children) {
    switch (t.type) {
      case 'text':
        out += escapeLatex(t.content);
        break;
      case 'softbreak':
        out += '\n';
        break;
      case 'hardbreak':
        out += '\\\\\n';
        break;
      case 'strong_open':
        out += '\\textbf{';
        break;
      case 'strong_close':
        out += '}';
        break;
      case 'em_open':
        out += '\\emph{';
        break;
      case 'em_close':
        out += '}';
        break;
      case 'code_inline':
        out += `\\texttt{${escapeLatex(t.content)}}`;
        break;
      case 'link_open': {
        // markdown-it always sets href on link_open
        out += `\\href{${escapeLatex(getAttr(t, 'href')!)}}{`;
        break;
      }
      case 'link_close':
        out += '}';
        break;
      case 'image': {
        const src = getAttr(t, 'src')!;
        const alt = t.content;
        out += `\\begin{figure}[h]\\centering\\includegraphics[width=0.8\\linewidth]{${escapeLatex(src)}}\\caption{${escapeLatex(alt)}}\\end{figure}`;
        break;
      }
      case 'math_inline':
        out += `$${t.content}$`;
        break;
      case 'pandoc_cite':
        out += `\\cite{${t.content}}`;
        break;
      case 'xref': {
        const meta = t.meta as { kind: 'fig' | 'tbl' | 'eq'; resolved: boolean };
        const word = KIND_WORD[meta.kind]!;
        if (!meta.resolved) out += `${word}~?${escapeLatex(t.content)}?`;
        else out += `${word}~\\ref{${meta.kind}:${t.content}}`;
        break;
      }
      case 'html_inline':
        // drop plugin-emitted HTML fragments (e.g. crossRef anchors)
        break;
      default:
        ctx.unknown.add(t.type);
    }
  }
  return out;
};

// markdown-it guarantees matched open/close pairs at the same level.
const skipTo = (tokens: Token[], from: number, closeType: string, depth: number): number => {
  let j = from;
  while (tokens[j]!.type !== closeType || tokens[j]!.level !== depth) j++;
  return j;
};

const renderTokens = (tokens: Token[], ctx: Context): string => {
  let out = '';

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    switch (t.type) {
      case 'heading_open': {
        const cmd = HEADING_COMMAND[t.tag];
        const content = renderInline(tokens[i + 1]!.children!, ctx);
        if (cmd) out += `\\${cmd}{${content}}\n\n`;
        else out += `\\textbf{${content}}\n\n`;
        i += 2;
        break;
      }
      case 'paragraph_open': {
        const content = renderInline(tokens[i + 1]!.children!, ctx);
        if (content.length) out += `${content}\n\n`;
        i += 2;
        break;
      }
      case 'bullet_list_open':
        out += '\\begin{itemize}\n';
        break;
      case 'bullet_list_close':
        out += '\\end{itemize}\n';
        break;
      case 'ordered_list_open':
        out += '\\begin{enumerate}\n';
        break;
      case 'ordered_list_close':
        out += '\\end{enumerate}\n';
        break;
      case 'list_item_open': {
        const end = skipTo(tokens, i + 1, 'list_item_close', t.level);
        const body = renderTokens(tokens.slice(i + 1, end), ctx).replace(/\n+$/, '');
        out += `\\item ${body}\n`;
        i = end;
        break;
      }
      case 'fence':
      case 'code_block': {
        const lang = t.info.trim();
        const label = lang ? `[language=${lang}]` : '';
        out += `\\begin{verbatim}${label}\n${escapeVerb(t.content.replace(/\n$/, ''))}\n\\end{verbatim}\n\n`;
        break;
      }
      case 'math_block':
        out += `\\[\n${t.content}\n\\]\n\n`;
        break;
      case 'blockquote_open': {
        const end = skipTo(tokens, i + 1, 'blockquote_close', t.level);
        const body = renderTokens(tokens.slice(i + 1, end), ctx).replace(/\n+$/, '');
        out += `\\begin{quote}\n${body}\n\\end{quote}\n\n`;
        i = end;
        break;
      }
      case 'hr':
        out += '\\par\\noindent\\hrulefill\\par\n\n';
        break;
      case 'table_open':
        ctx.tableState = { inHeader: false, cols: 0, row: [] };
        out += '__TABLE_START__';
        break;
      case 'thead_open':
        ctx.tableState!.inHeader = true;
        break;
      case 'thead_close':
        ctx.tableState!.inHeader = false;
        break;
      case 'tr_open':
        ctx.tableState!.row = [];
        break;
      case 'tr_close': {
        const ts = ctx.tableState!;
        const rowLine = `${ts.row.join(' & ')} \\\\\n`;
        if (ts.inHeader) {
          ts.cols = ts.row.length;
          out = out.replace(
            '__TABLE_START__',
            `\\begin{tabular}{${'l'.repeat(ts.cols)}}\n\\toprule\n`,
          );
          out += `${rowLine}\\midrule\n`;
        } else {
          out += rowLine;
        }
        break;
      }
      case 'th_open':
      case 'td_open': {
        const cell = renderInline(tokens[i + 1]!.children!, ctx);
        const ts = ctx.tableState!;
        ts.row.push(t.type === 'th_open' ? `\\textbf{${cell}}` : cell);
        i += 2;
        break;
      }
      case 'table_close':
        out += '\\bottomrule\n\\end{tabular}\n\n';
        ctx.tableState = null;
        break;
      case 'html_block':
        // drop plugin-emitted HTML blocks
        break;
      case 'inline': {
        const content = renderInline(t.children!, ctx);
        if (content.length) out += `${content}\n\n`;
        break;
      }
      case 'footnote_block_open':
        i = skipTo(tokens, i + 1, 'footnote_block_close', t.level);
        break;
      case 'tbody_open':
      case 'tbody_close':
        break;
      default:
        ctx.unknown.add(t.type);
    }
  }
  return out;
};

export interface LatexResult {
  content: string;
  unknownTypes: Set<string>;
}

export const markdownToLatexWithMeta = (source: string, md: MarkdownIt): LatexResult => {
  const tokens = md.parse(source, {});
  const ctx: Context = { unknown: new Set(), tableState: null };
  const body = renderTokens(tokens, ctx);
  return {
    content: `${PREAMBLE}${body}${POSTAMBLE}`,
    unknownTypes: ctx.unknown,
  };
};

export const markdownToLatex = (source: string, md: MarkdownIt): string =>
  markdownToLatexWithMeta(source, md).content;
