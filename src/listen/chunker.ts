import type { SpeechChunk } from '../types.ts';

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

type FootnoteMap = ReadonlyMap<string, string>;

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

const buildFootnoteMap = (root: HTMLElement): FootnoteMap => {
  const map = new Map<string, string>();
  for (const li of root.querySelectorAll('section.footnotes li[id]')) {
    const clone = li.cloneNode(true) as Element;
    for (const bref of clone.querySelectorAll('.footnote-backref')) bref.remove();
    const content = collapse(clone.textContent!);
    if (content) map.set(li.id, content);
  }
  return map;
};

const speakableText = (
  el: Element,
  fm: FootnoteMap,
  anchor: Element,
  side: SpeechChunk[],
): string => {
  const parts: string[] = [];
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent!);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const child = node as Element;
    const cls = child.classList;
    if (cls.contains('katex-display')) return;
    if (cls.contains('katex')) {
      parts.push(' inline equation ');
      return;
    }
    if (cls.contains('footnote-ref')) {
      const link = child.querySelector('a[href^="#"]');
      const id = link?.getAttribute('href')?.slice(1) ?? '';
      const content = fm.get(id);
      if (content) {
        const suffix = /[.!?]$/.test(content) ? '' : '.';
        side.push({ text: `Footnote: ${content}${suffix}`, el: anchor });
      }
      return;
    }
    for (const c of child.childNodes) walk(c);
  };
  for (const c of el.childNodes) walk(c);
  return collapse(parts.join(''));
};

const chunkFromHeading = (
  el: Element,
  tag: string,
  fm: FootnoteMap,
  side: SpeechChunk[],
): SpeechChunk => {
  const level = tag[1]!;
  const prefix = level === '1' ? '' : 'Section: ';
  return { text: `${prefix}${speakableText(el, fm, el, side)}.`, el };
};

const chunkFromCodeBlock = (el: Element): SpeechChunk => {
  const code = el.querySelector('code')!;
  const langCls = [...code.classList].find((c) => c.startsWith('language-'));
  const lang = langCls ? langCls.replace('language-', '') : null;
  return {
    text: lang ? `A code block in ${lang}.` : 'A code block is shown.',
    el,
  };
};

const chunksFromTable = (el: Element, fm: FootnoteMap): SpeechChunk[] => {
  const headers = [...el.querySelectorAll('thead th')].map((th) => collapse(th.textContent!));
  const rows = [...el.querySelectorAll('tbody tr')];
  if (headers.length === 0 || rows.length === 0) {
    return [{ text: 'A table is shown.', el }];
  }
  const out: SpeechChunk[] = [{ text: `A table with columns: ${headers.join(', ')}.`, el }];
  rows.forEach((tr, ri) => {
    const side: SpeechChunk[] = [];
    const cells = [...tr.querySelectorAll('td')].map((td) => speakableText(td, fm, tr, side));
    const pairs = cells.map((c, ci) => {
      const h = headers[ci];
      return h ? `${h}: ${c}` : c;
    });
    out.push({ text: `Row ${ri + 1}. ${pairs.join('. ')}.`, el: tr });
    out.push(...side);
  });
  return out;
};

const chunkFromCallout = (el: Element, fm: FootnoteMap, side: SpeechChunk[]): SpeechChunk => {
  const titleEl = el.querySelector('.callout-title');
  const bodyEl = el.querySelector('.callout-body');
  const title = titleEl ? speakableText(titleEl, fm, el, side) : 'Note';
  const body = bodyEl ? speakableText(bodyEl, fm, el, side) : '';
  return { text: `${title || 'Note'}: ${body}`, el };
};

const chunkFromAtlassianPanel = (
  el: Element,
  fm: FootnoteMap,
  side: SpeechChunk[],
): SpeechChunk => {
  const titleEl = el.querySelector('.atl-panel-title');
  const title = titleEl ? collapse(titleEl.textContent!) : '';
  const full = speakableText(el, fm, el, side);
  const body = title ? full.replace(title, '').trim() : full;
  return { text: `${title || 'Panel'} panel: ${body}`, el };
};

const chunkFromDetails = (el: Element, fm: FootnoteMap, side: SpeechChunk[]): SpeechChunk => {
  const summaryEl = el.querySelector('summary');
  const bodyEl = el.querySelector('.expand-body');
  const summary = summaryEl ? speakableText(summaryEl, fm, el, side) : 'Expandable section';
  const body = bodyEl ? speakableText(bodyEl, fm, el, side) : '';
  return { text: `${summary || 'Expandable section'}: ${body}`, el };
};

const chunksFromList = (el: Element, fm: FootnoteMap): SpeechChunk[] => {
  const items = [...el.querySelectorAll(':scope > li')];
  if (items.length === 0) return [];
  const isTask = el.classList.contains('task-list');
  const isOrdered = el.tagName.toLowerCase() === 'ol';
  const out: SpeechChunk[] = [];
  items.forEach((li, idx) => {
    const side: SpeechChunk[] = [];
    const raw = speakableText(li, fm, li, side);
    if (isTask) {
      const cb = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      const done = cb?.checked ? 'Done' : 'Not done';
      out.push({ text: `${done}: ${raw}`, el: li });
    } else if (isOrdered) {
      out.push({ text: `${idx + 1}. ${raw}`, el: li });
    } else {
      out.push({ text: raw, el: li });
    }
    out.push(...side);
  });
  return out;
};

const chunksFromDefinitionList = (el: Element, fm: FootnoteMap): SpeechChunk[] => {
  const out: SpeechChunk[] = [];
  for (const child of el.children) {
    const tag = child.tagName.toLowerCase();
    if (tag !== 'dt' && tag !== 'dd') continue;
    const side: SpeechChunk[] = [];
    const body = speakableText(child, fm, child, side);
    out.push({ text: tag === 'dt' ? `${body}:` : body, el: child });
    out.push(...side);
  }
  return out;
};

const processElement = (el: Element, out: SpeechChunk[], fm: FootnoteMap): void => {
  const tag = el.tagName.toLowerCase();
  const classes = el.classList;

  if (classes.contains('toc-container')) return;
  if (classes.contains('footnotes')) return;

  if (HEADING_TAGS.has(tag)) {
    const side: SpeechChunk[] = [];
    out.push(chunkFromHeading(el, tag, fm, side));
    out.push(...side);
    return;
  }

  if (classes.contains('mermaid-container')) {
    out.push({ text: 'A diagram is shown here.', el });
    return;
  }

  if (classes.contains('katex-display')) {
    out.push({ text: 'A mathematical equation is displayed.', el });
    return;
  }

  if (tag === 'pre' && el.querySelector('code')) {
    out.push(chunkFromCodeBlock(el));
    return;
  }

  if (tag === 'table') {
    out.push(...chunksFromTable(el, fm));
    return;
  }

  if (classes.contains('callout')) {
    const side: SpeechChunk[] = [];
    out.push(chunkFromCallout(el, fm, side));
    out.push(...side);
    return;
  }

  if (classes.contains('atl-panel')) {
    const side: SpeechChunk[] = [];
    out.push(chunkFromAtlassianPanel(el, fm, side));
    out.push(...side);
    return;
  }

  if (tag === 'details') {
    const side: SpeechChunk[] = [];
    out.push(chunkFromDetails(el, fm, side));
    out.push(...side);
    return;
  }

  if (tag === 'p') {
    const side: SpeechChunk[] = [];
    const body = speakableText(el, fm, el, side);
    if (body) out.push({ text: body, el });
    out.push(...side);
    return;
  }

  if (tag === 'blockquote') {
    const side: SpeechChunk[] = [];
    const body = speakableText(el, fm, el, side);
    out.push({ text: `Quote: ${body}`, el });
    out.push(...side);
    return;
  }

  if (tag === 'ul' || tag === 'ol') {
    out.push(...chunksFromList(el, fm));
    return;
  }

  if (tag === 'hr') {
    out.push({ text: '...', el });
    return;
  }

  if (tag === 'dl') {
    out.push(...chunksFromDefinitionList(el, fm));
    return;
  }

  if (el.children.length > 0) {
    for (const child of el.children) processElement(child, out, fm);
    return;
  }

  const side: SpeechChunk[] = [];
  const fallback = speakableText(el, fm, el, side);
  if (fallback.length > 2) out.push({ text: fallback, el });
  out.push(...side);
};

export const extractSpeakableChunks = (root: HTMLElement): SpeechChunk[] => {
  const fm = buildFootnoteMap(root);
  const chunks: SpeechChunk[] = [];
  for (const child of root.children) processElement(child, chunks, fm);
  return chunks;
};
