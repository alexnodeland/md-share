export interface DocxConvertResult {
  html: string;
  warnings: string[];
}

export interface DocxToMdDeps {
  mammothConvert: (bytes: ArrayBuffer) => Promise<DocxConvertResult>;
  htmlToMarkdown: (html: string) => Promise<string>;
}

export const docxToMarkdown = async (bytes: ArrayBuffer, deps: DocxToMdDeps): Promise<string> => {
  const { html } = await deps.mammothConvert(bytes);
  return deps.htmlToMarkdown(html);
};
