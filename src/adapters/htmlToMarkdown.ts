import type TurndownService from 'turndown';
import type { HtmlToMarkdown } from '../ports.ts';

const BOLD_RE = /font-weight:\s*(bold|[6-9]00)/i;
const ITALIC_RE = /font-style:\s*italic/i;

/** `**text **` isn't bold in Markdown — keep the spaces outside the markers. */
const wrap = (content: string, marker: string): string => {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(content)!;
  const [, lead, core, trail] = match;
  return core ? `${lead}${marker}${core}${marker}${trail}` : content;
};

const create = async (): Promise<TurndownService> => {
  const [{ default: Turndown }, { gfm }] = await Promise.all([
    import('turndown'),
    import('turndown-plugin-gfm'),
  ]);
  const td = new Turndown({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    hr: '---',
  });
  td.use(gfm);
  td.remove(['script', 'style', 'meta', 'title', 'head']);
  // Rules added later win. markdown-it needs `~~`, and `-   item` (turndown's
  // default) is noisy; use one space and indent children to the text column.
  td.addRule('strikethrough', {
    filter: ['del', 's', 'strike' as keyof HTMLElementTagNameMap],
    replacement: (content) => `~~${content}~~`,
  });
  // Word and Google Docs wrap every table cell's text in <p>; the default
  // paragraph rule's blank lines would break the GFM table row.
  td.addRule('cellParagraph', {
    filter: (node) => node.nodeName === 'P' && /^T[DH]$/.test(node.parentNode?.nodeName ?? ''),
    replacement: (content, node) =>
      content.trim() + ((node as HTMLElement).nextElementSibling ? ' ' : ''),
  });
  // Word "Code" styles arrive as <pre> without an inner <code>, sometimes
  // with <br> for line breaks.
  td.addRule('bareCodeBlock', {
    filter: (node) => node.nodeName === 'PRE' && node.firstElementChild?.nodeName !== 'CODE',
    replacement: (_content, node) => {
      for (const br of Array.from((node as HTMLElement).querySelectorAll('br'))) {
        br.replaceWith('\n');
      }
      return `\n\n\`\`\`\n${node.textContent ?? ''}\n\`\`\`\n\n`;
    },
  });
  // GFM header cells are already bold; don't wrap their text in ** too.
  td.addRule('headerCellBold', {
    filter: (node) =>
      (node.nodeName === 'STRONG' || node.nodeName === 'B') && node.closest('th') !== null,
    replacement: (content) => content,
  });
  td.addRule('listItem', {
    filter: 'li',
    replacement: (content, node) => {
      const parent = node.parentNode as HTMLElement;
      let prefix = '- ';
      if (parent.nodeName === 'OL') {
        const start = Number(parent.getAttribute('start') ?? 1);
        prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
      }
      const body = content
        .replace(/^\n+/, '')
        .replace(/\n+$/, '\n')
        .replace(/\n/gm, `\n${' '.repeat(prefix.length)}`);
      return prefix + body + (node.nextSibling && !body.endsWith('\n') ? '\n' : '');
    },
  });
  // Google Docs wraps every copy in <b style="font-weight:normal" id="docs-internal-guid-…">.
  td.addRule('googleDocsWrapper', {
    filter: (node) => node.nodeName === 'B' && node.id.startsWith('docs-internal-guid'),
    replacement: (content) => content,
  });
  // …and marks bold/italic with inline styles rather than <b>/<i>.
  td.addRule('styledEmphasis', {
    filter: (node) => {
      if (node.nodeName !== 'SPAN') return false;
      const style = node.getAttribute('style') ?? '';
      return BOLD_RE.test(style) || ITALIC_RE.test(style);
    },
    replacement: (content, node) => {
      const style = (node as HTMLElement).getAttribute('style') ?? '';
      const marker = (BOLD_RE.test(style) ? '**' : '') + (ITALIC_RE.test(style) ? '*' : '');
      return wrap(content, marker);
    },
  });
  return td;
};

let service: Promise<TurndownService> | null = null;

export const browserHtmlToMarkdown: HtmlToMarkdown = {
  convert: async (html) => {
    service ??= create();
    return (await service).turndown(html).trim();
  },
};
