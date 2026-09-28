import type { DocxReader } from '../ports.ts';

// mammoth maps "Heading 1–6", lists, tables, bold/italic, and links on its
// own; these are the other styles real documents lean on — Word's built-ins
// and the ones Pandoc writes — so they arrive as structure, not plain text.
const STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote > p:fresh",
  "p[style-name='Code'] => pre:separator('\\n')",
  "p[style-name='Source Code'] => pre:separator('\\n')",
  "r[style-name='Code'] => code",
  "r[style-name='Verbatim Char'] => code",
];

const EMPTY_IMG_RE = /<img\b[^>]*\bsrc=""[^>]*\/?>/g;

export const browserDocxReader: DocxReader = {
  toHtml: async (data, embedImage) => {
    const { default: mammoth } = await import('mammoth');
    let images = 0;
    let skippedImages = 0;
    const result = await mammoth.convertToHtml(
      // The browser build reads `arrayBuffer`, the Node build (tests) `buffer`;
      // both hand it to the same zip reader.
      { arrayBuffer: data, buffer: data },
      {
        styleMap: STYLE_MAP,
        convertImage: mammoth.images.imgElement(async (image) => {
          const bytes = new Uint8Array(await image.readAsArrayBuffer());
          const src = await embedImage(bytes, image.contentType).catch(() => null);
          if (src) images++;
          else skippedImages++;
          return { src: src ?? '' };
        }),
      },
    );
    return { html: result.value.replace(EMPTY_IMG_RE, ''), images, skippedImages };
  },
};
