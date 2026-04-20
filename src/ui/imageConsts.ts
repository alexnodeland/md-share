export const IMAGE_MAX_DIM = 1600;
export const IMAGE_QUALITY = 0.85;

export const IMAGE_EMBED_CONFIRM =
  'Embed this image in the document? It will be resized, compressed, and pasted as a long encoded string inline in your Markdown.';

export const fmtBytes = (n: number): string =>
  n >= 1024 * 1024
    ? `${(n / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;
