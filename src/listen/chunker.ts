import type { SpeechChunk } from '../types.ts';

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const text = (el: Element | null | undefined): string => el?.textContent?.trim() ?? '';

const chunkFromHeading = (el: Element, tag: string): SpeechChunk => {
  const level = tag[1]!;
  const prefix = level === '1' ? '' : 'Section: ';
  return { text: `${prefix}${text(el)}.`, el };
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

const chunksFromTable = (el: Element): SpeechChunk[] => {
  const headers = [...el.querySelectorAll('thead th')].map((th) => text(th));
  const rows = [...el.querySelectorAll('tbody tr')];
  if (headers.length === 0 || rows.length === 0) {
    return [{ text: 'A table is shown.', el }];
  }
  const chunks: SpeechChunk[] = [{ text: `A table with columns: ${headers.join(', ')}.`, el }];
  rows.forEach((tr, ri) => {
    const cells = [...tr.querySelectorAll('td')].map((td) => text(td));
    const pairs = cells.map((c, ci) => {
      const h = headers[ci];
      return h ? `${h}: ${c}` : c;
    });
    chunks.push({ text: `Row ${ri + 1}. ${pairs.join('. ')}.`, el: tr });
  });
  return chunks;
};

const chunkFromCallout = (el: Element): SpeechChunk => {
  const title = text(el.querySelector('.callout-title')) || 'Note';
  const body = text(el.querySelector('.callout-body'));
  return { text: `${title}: ${body}`, el };
};

const chunkFromAtlassianPanel = (el: Element): SpeechChunk => {
  const title = text(el.querySelector('.atl-panel-title')) || 'Panel';
  const body = text(el).replace(title, '').trim();
  return { text: `${title} panel: ${body}`, el };
};

const chunkFromDetails = (el: Element): SpeechChunk => {
  const summary = text(el.querySelector('summary')) || 'Expandable section';
  const body = text(el.querySelector('.expand-body'));
  return { text: `${summary}: ${body}`, el };
};

const chunksFromList = (el: Element): SpeechChunk[] => {
  const items = [...el.querySelectorAll(':scope > li')];
  if (items.length === 0) return [];
  const isTask = el.classList.contains('task-list');
  const isOrdered = el.tagName.toLowerCase() === 'ol';
  return items.map((li, idx) => {
    const raw = text(li);
    if (isTask) {
      const cb = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      const done = cb?.checked ? 'Done' : 'Not done';
      return { text: `${done}: ${raw}`, el: li };
    }
    if (isOrdered) return { text: `${idx + 1}. ${raw}`, el: li };
    return { text: raw, el: li };
  });
};

const chunksFromDefinitionList = (el: Element): SpeechChunk[] => {
  const chunks: SpeechChunk[] = [];
  for (const child of el.children) {
    const tag = child.tagName.toLowerCase();
    if (tag === 'dt') chunks.push({ text: `${text(child)}:`, el: child });
    if (tag === 'dd') chunks.push({ text: text(child), el: child });
  }
  return chunks;
};

const chunksFromFootnotes = (el: Element): SpeechChunk[] => {
  const chunks: SpeechChunk[] = [{ text: 'Footnotes section.', el }];
  for (const li of el.querySelectorAll('li')) {
    chunks.push({ text: text(li), el: li });
  }
  return chunks;
};

const processElement = (el: Element, out: SpeechChunk[]): void => {
  const tag = el.tagName.toLowerCase();
  const classes = el.classList;

  if (classes.contains('toc-container')) return;

  if (HEADING_TAGS.has(tag)) {
    out.push(chunkFromHeading(el, tag));
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
    out.push(...chunksFromTable(el));
    return;
  }

  if (classes.contains('callout')) {
    out.push(chunkFromCallout(el));
    return;
  }

  if (classes.contains('atl-panel')) {
    out.push(chunkFromAtlassianPanel(el));
    return;
  }

  if (tag === 'details') {
    out.push(chunkFromDetails(el));
    return;
  }

  if (tag === 'p') {
    const body = text(el);
    if (body) out.push({ text: body, el });
    return;
  }

  if (tag === 'blockquote') {
    out.push({ text: `Quote: ${text(el)}`, el });
    return;
  }

  if (tag === 'ul' || tag === 'ol') {
    out.push(...chunksFromList(el));
    return;
  }

  if (tag === 'hr') {
    out.push({ text: '...', el });
    return;
  }

  if (tag === 'dl') {
    out.push(...chunksFromDefinitionList(el));
    return;
  }

  if (classes.contains('footnotes')) {
    out.push(...chunksFromFootnotes(el));
    return;
  }

  if (el.children.length > 0) {
    for (const child of el.children) processElement(child, out);
    return;
  }

  const fallback = text(el);
  if (fallback.length > 2) out.push({ text: fallback, el });
};

export const extractSpeakableChunks = (root: HTMLElement): SpeechChunk[] => {
  const chunks: SpeechChunk[] = [];
  for (const child of root.children) processElement(child, chunks);
  return chunks;
};
