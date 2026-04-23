import { type DocxConvertResult, docxToMarkdown } from '../importers/docx.ts';
import type { DocxToMd, HtmlToMd } from '../ports.ts';

interface MammothBrowser {
  convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: Record<string, unknown>,
  ): Promise<{ value: string; messages: Array<{ message: string; type?: string }> }>;
}

let mod: MammothBrowser | null = null;
let pending: Promise<MammothBrowser> | null = null;

const loadLib = (): Promise<MammothBrowser> => {
  if (mod) return Promise.resolve(mod);
  if (!pending) {
    pending = import('mammoth/mammoth.browser.min.js').then((m) => {
      const resolved =
        (m as unknown as { default?: MammothBrowser }).default ?? (m as unknown as MammothBrowser);
      mod = resolved;
      return mod;
    });
  }
  return pending;
};

export const createBrowserDocxToMd = (htmlToMd: HtmlToMd): DocxToMd => ({
  convert: async (bytes) => {
    const mammoth = await loadLib();
    return docxToMarkdown(bytes, {
      mammothConvert: async (buf): Promise<DocxConvertResult> => {
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        return {
          html: result.value,
          warnings: result.messages.map((m) => m.message),
        };
      },
      htmlToMarkdown: (html) => htmlToMd.convert(html),
    });
  },
});
