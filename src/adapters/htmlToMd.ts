import type TurndownService from 'turndown';
import { htmlToMarkdown } from '../importers/html.ts';
import type { HtmlToMd } from '../ports.ts';

type TurndownCtor = typeof TurndownService;

let ctor: TurndownCtor | null = null;
let pending: Promise<TurndownCtor> | null = null;

const loadLib = (): Promise<TurndownCtor> => {
  if (ctor) return Promise.resolve(ctor);
  if (!pending) {
    pending = import('turndown').then((m) => {
      const resolved =
        (m as unknown as { default?: TurndownCtor }).default ?? (m as unknown as TurndownCtor);
      ctor = resolved;
      return ctor;
    });
  }
  return pending;
};

const parseHtml = (html: string): Document => new DOMParser().parseFromString(html, 'text/html');

export const browserHtmlToMd: HtmlToMd = {
  convert: async (html) => {
    const Turndown = await loadLib();
    const td = new Turndown({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      hr: '---',
    });
    td.addRule('strikethrough', {
      filter: ['del', 's'],
      replacement: (content: string) => `~~${content}~~`,
    });
    return htmlToMarkdown(html, {
      parseHtml,
      turndown: (sanitized) => td.turndown(sanitized),
    });
  },
};
