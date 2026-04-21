import { buildDocxBlob, type DocxBuildInput } from '../export/docx.ts';

type HtmlDocxModule = typeof import('html-docx-js-typescript');

let mod: HtmlDocxModule | null = null;
let pending: Promise<HtmlDocxModule> | null = null;

const loadLib = (): Promise<HtmlDocxModule> => {
  if (mod) return Promise.resolve(mod);
  if (!pending) {
    pending = import('html-docx-js-typescript').then((m) => {
      mod = m;
      return mod;
    });
  }
  return pending;
};

export const buildBrowserDocx = async (input: DocxBuildInput): Promise<Blob> => {
  const lib = await loadLib();
  return buildDocxBlob(input, {
    asBlob: async (html) => {
      const out = await lib.asBlob(html);
      if (out instanceof Blob) return out;
      return new Blob([out as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    },
  });
};
