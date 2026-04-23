export interface InsertResult {
  value: string;
  cursor: number;
}

export const insertImageAtCursor = (
  value: string,
  start: number,
  end: number,
  dataUrl: string,
  alt = '',
): InsertResult => {
  const snippet = `![${alt}](${dataUrl})`;
  return {
    value: value.slice(0, start) + snippet + value.slice(end),
    cursor: start + snippet.length,
  };
};

// SVG can contain <script> and event handlers; reject from clipboard/drop.
// Matches `image/svg+xml` and common variants (case-insensitive, ignores params).
export const isUnsafeImageMime = (mime: string): boolean => {
  // String.split always returns at least one element, so [0] is defined.
  const base = (mime.split(';', 1)[0] as string).trim().toLowerCase();
  return base === 'image/svg+xml' || base === 'image/svg';
};
