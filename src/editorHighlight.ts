import type hljs from 'highlight.js';

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const needsTrailingNewline = (source: string): boolean =>
  source.length === 0 || source.endsWith('\n');

export const appendTrailingSentinel = (html: string, source: string): string =>
  needsTrailingNewline(source) ? `${html}\n ` : html;

const FENCE_OPEN_RE = /^(`{3,})(\S*)/;

const highlightSafe = (text: string, lang: string, highlighter: typeof hljs): string => {
  try {
    return highlighter.highlight(text, { language: lang }).value;
  } catch {
    return escapeHtml(text);
  }
};

const highlightInner = (lines: string[], lang: string, highlighter: typeof hljs): string | null => {
  if (lines.length === 0) return null;
  const text = lines.join('\n');
  if (lang && highlighter.getLanguage(lang)) return highlightSafe(text, lang, highlighter);
  return escapeHtml(text);
};

const wrapFenceLine = (line: string): string =>
  `<span class="hljs-code">${escapeHtml(line)}</span>`;

interface ParsedSegments {
  chunks: string[];
}

export const highlightMarkdownSource = (source: string, highlighter: typeof hljs): string => {
  const lines = source.split('\n');
  const result: ParsedSegments = { chunks: [] };
  let proseBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let openerLine = '';
  let fenceMarkLen = 0;
  let fenceLang = '';
  let inFence = false;

  const flushProse = () => {
    if (proseBuffer.length === 0) return;
    result.chunks.push(highlightSafe(proseBuffer.join('\n'), 'markdown', highlighter));
    proseBuffer = [];
  };

  const flushFence = (closerLine: string | undefined) => {
    const parts: string[] = [wrapFenceLine(openerLine)];
    const inner = highlightInner(codeBuffer, fenceLang, highlighter);
    if (inner !== null) parts.push(inner);
    if (closerLine !== undefined) parts.push(wrapFenceLine(closerLine));
    result.chunks.push(parts.join('\n'));
    codeBuffer = [];
    openerLine = '';
    fenceMarkLen = 0;
    fenceLang = '';
  };

  for (const line of lines) {
    if (!inFence) {
      const m = line.match(FENCE_OPEN_RE);
      if (m) {
        flushProse();
        openerLine = line;
        fenceMarkLen = m[1]!.length;
        fenceLang = m[2]!;
        inFence = true;
        continue;
      }
      proseBuffer.push(line);
      continue;
    }
    const closerRe = new RegExp(`^\`{${fenceMarkLen},}\\s*$`);
    if (closerRe.test(line)) {
      flushFence(line);
      inFence = false;
      continue;
    }
    codeBuffer.push(line);
  }
  if (inFence) flushFence(undefined);
  flushProse();
  return appendTrailingSentinel(result.chunks.join('\n'), source);
};
