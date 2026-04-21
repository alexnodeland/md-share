const DEFAULT_MAX_LEN = 180;
const ELLIPSIS = '…';

/**
 * Normalise a speech chunk for on-screen caption display. Trims outer
 * whitespace, collapses inner runs into single spaces, and truncates with an
 * ellipsis when longer than `maxLen` (default: 180 chars). `maxLen` must be at
 * least 1; smaller values are clamped so the output is never empty when the
 * source had content.
 */
export const formatCaption = (chunkText: string, maxLen: number = DEFAULT_MAX_LEN): string => {
  const collapsed = chunkText.replace(/\s+/g, ' ').trim();
  if (collapsed.length === 0) return '';
  const cap = Math.max(1, Math.floor(maxLen));
  if (collapsed.length <= cap) return collapsed;
  if (cap === 1) return ELLIPSIS;
  return `${collapsed.slice(0, cap - 1).trimEnd()}${ELLIPSIS}`;
};
