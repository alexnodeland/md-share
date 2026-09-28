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

const MD_DATA_IMAGE_RE = /!\[([^\]]*)\]\(\s*<?data:[^)\s>]*>?(?:\s+"[^"]*")?\s*\)/g;
const HTML_DATA_IMAGE_RE = /<img\b[^>]*\bsrc\s*=\s*["']data:[^"']*["'][^>]*>/gi;

/**
 * The document without its embedded (data: URI) images, which are usually
 * most of a share link's length. Each becomes its alt text, so readers still
 * know something was there.
 */
export const stripEmbeddedImages = (source: string): { text: string; count: number } => {
  let count = 0;
  const text = source
    .replace(MD_DATA_IMAGE_RE, (_, alt: string) => {
      count++;
      return alt.trim() ? `*[Image: ${alt.trim()}]*` : '*[Image]*';
    })
    .replace(HTML_DATA_IMAGE_RE, () => {
      count++;
      return '*[Image]*';
    });
  return { text, count };
};
