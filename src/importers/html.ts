export interface HtmlToMdDeps {
  parseHtml: (html: string) => Document;
  turndown: (sanitizedHtml: string) => string;
}

const BLOCKED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'LINK',
  'META',
  'BASE',
  'OBJECT',
  'EMBED',
  'IFRAME',
  'FRAME',
  'FRAMESET',
  'APPLET',
]);

const DANGEROUS_URL_RE = /^\s*(javascript|data|vbscript):/i;
const SAFE_DATA_URL_RE = /^\s*data:image\//i;

const sanitizeElement = (el: Element): void => {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on')) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (
      (name === 'href' || name === 'src' || name === 'xlink:href') &&
      DANGEROUS_URL_RE.test(attr.value)
    ) {
      if (name === 'src' && SAFE_DATA_URL_RE.test(attr.value)) continue;
      el.removeAttribute(attr.name);
    }
  }
};

export const sanitizeDocument = (doc: Document): void => {
  const all = doc.querySelectorAll('*');
  for (const el of Array.from(all)) {
    const tag = el.tagName.toUpperCase();
    if (BLOCKED_TAGS.has(tag)) {
      el.remove();
      continue;
    }
    if (tag === 'SVG') {
      for (const child of Array.from(el.querySelectorAll('script, foreignObject'))) child.remove();
    }
    sanitizeElement(el);
  }
};

export const postProcess = (md: string): string =>
  md
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();

export const htmlToMarkdown = (html: string, deps: HtmlToMdDeps): string => {
  const doc = deps.parseHtml(html);
  sanitizeDocument(doc);
  const body = doc.body;
  const cleaned = body ? body.innerHTML : '';
  return postProcess(deps.turndown(cleaned));
};
