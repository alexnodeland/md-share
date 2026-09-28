/**
 * Screen rect of source offsets [start, end) in the editor, measured on the
 * highlighted mirror (a textarea can't report glyph positions itself).
 * Collapsed ranges measure the caret.
 */
export const measureRange = (mirror: HTMLElement, start: number, end: number): DOMRect | null => {
  const walker = document.createTreeWalker(mirror, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let startNode: Text | null = null;
  let startInner = 0;
  let endNode: Text | null = null;
  let endInner = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    if (!startNode && offset + len >= start) {
      startNode = node;
      startInner = start - offset;
    }
    if (offset + len >= end) {
      endNode = node;
      endInner = end - offset;
      break;
    }
    offset += len;
    node = walker.nextNode() as Text | null;
  }
  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startInner);
  range.setEnd(endNode, endInner);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
};
