export interface DocxBuildInput {
  title: string;
  body: string;
  css: string;
}

export interface DocxBuildDeps {
  asBlob: (html: string) => Promise<Blob>;
}

const htmlShell = ({ title, body, css }: DocxBuildInput): string =>
  `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>${css}</style></head><body><article>${body}</article></body></html>`;

export const buildDocxBlob = async (input: DocxBuildInput, deps: DocxBuildDeps): Promise<Blob> =>
  deps.asBlob(htmlShell(input));
