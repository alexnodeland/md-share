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
