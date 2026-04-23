import { cleanHeadingText, slugifyHeading, uniqueSlug } from './slug.ts';

export interface HeadingSlice {
  id: string;
  level: number;
  startLine: number;
  endLine: number;
}

const HEADING_RE = /^(#{1,6})\s+(.+)/;
const FENCE_RE = /^```/;

export const computeOutline = (source: string): HeadingSlice[] => {
  const lines = source.split('\n');
  const slices: Array<{ id: string; level: number; startLine: number }> = [];
  const used = new Map<string, number>();
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(HEADING_RE);
    if (!match) continue;
    const hashes = match[1] as string;
    const text = cleanHeadingText(match[2] as string);
    const id = uniqueSlug(slugifyHeading(text), used);
    slices.push({ id, level: hashes.length, startLine: i });
  }
  const totalLines = lines.length;
  return slices.map((slice, idx) => {
    const next = slices[idx + 1];
    return {
      ...slice,
      endLine: next ? next.startLine : totalLines,
    };
  });
};

export const focusSlice = (source: string, focusedId: string): string | null => {
  const outline = computeOutline(source);
  const index = outline.findIndex((s) => s.id === focusedId);
  if (index === -1) return null;
  const slice = outline[index] as HeadingSlice;
  const lines = source.split('\n');
  // Extend end through any deeper (sub-) headings that follow the focused one.
  let endLine = slice.endLine;
  for (let i = index + 1; i < outline.length; i++) {
    const candidate = outline[i] as HeadingSlice;
    if (candidate.level > slice.level) {
      endLine = candidate.endLine;
    } else {
      break;
    }
  }
  return lines.slice(slice.startLine, endLine).join('\n');
};
