import type MarkdownIt from 'markdown-it';

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

const countNewlines = (s: string): number => s.split('\n').length - 1;

/** Index just past the backtick run starting at `i`. */
const runEnd = (src: string, i: number): number => {
  let j = i;
  while (src[j] === '`') j++;
  return j;
};

/**
 * End of the inline code span opened by the backtick run at `i`, or -1 if the
 * run is literal. A span can't cross a blank line.
 */
const codeSpanEnd = (src: string, i: number): number => {
  const open = runEnd(src, i) - i;
  const limit = src.indexOf('\n\n', i);
  let j = runEnd(src, i);
  for (;;) {
    j = src.indexOf('`', j);
    if (j === -1 || (limit !== -1 && j > limit)) return -1;
    const end = runEnd(src, j);
    if (end - j === open) return end;
    j = end;
  }
};

/**
 * Fence state after `line`: the open fence marker, null when outside a fence,
 * or undefined when the line is ordinary prose.
 */
const nextFence = (line: string, fence: string | null): string | null | undefined => {
  const marker = FENCE_RE.exec(line)?.[1] ?? null;
  if (fence === null) return marker ?? undefined;
  const closes = marker !== null && marker[0] === fence[0] && marker.length >= fence.length;
  return closes ? null : fence;
};

/** Consumes one prose construct at `i`: a comment, a code span, or a char. */
const proseStep = (src: string, i: number): [text: string, next: number] => {
  if (src[i] === '`') {
    const end = codeSpanEnd(src, i);
    const stop = end === -1 ? runEnd(src, i) : end;
    return [src.slice(i, stop), stop];
  }
  if (src.startsWith('%%', i)) {
    const close = src.indexOf('%%', i + 2);
    if (close !== -1) return ['\n'.repeat(countNewlines(src.slice(i, close))), close + 2];
  }
  return [src[i]!, i + 1];
};

/**
 * Removes Obsidian `%%comments%%` outside code, replacing each with as many
 * newlines as it spanned so every later line keeps its number (task
 * checkboxes map clicks back to source lines).
 */
export const stripObsidianComments = (src: string): string => {
  let out = '';
  let i = 0;
  let fence: string | null = null;
  let lineStart = true;
  while (i < src.length) {
    if (lineStart) {
      const nl = src.indexOf('\n', i);
      const end = nl === -1 ? src.length : nl + 1;
      const next = nextFence(src.slice(i, end), fence);
      if (next !== undefined) {
        fence = next;
        out += src.slice(i, end);
        i = end;
        continue;
      }
    }
    lineStart = src[i] === '\n';
    const [text, stop] = proseStep(src, i);
    out += text;
    i = stop;
  }
  return out;
};

export const pluginObsidianComments = (md: MarkdownIt): void => {
  md.core.ruler.before('normalize', 'strip_comments', (state) => {
    state.src = stripObsidianComments(state.src);
  });
};
