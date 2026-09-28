import type { ImageCompressor } from '../adapters/imageCompress.ts';
import { describeDocxImport, fileKind, OPENABLE_TYPES } from '../fileKind.ts';
import type { DocxReader, HtmlToMarkdown } from '../ports.ts';
import { fmtBytes, IMAGE_EMBED_CONFIRM, IMAGE_MAX_DIM, IMAGE_QUALITY } from './imageConsts.ts';
import { showToast } from './toast.ts';

export interface FileImportDeps {
  docxReader: DocxReader;
  htmlToMarkdown: HtmlToMarkdown;
  compressImage: ImageCompressor;
  /** Replace the document with imported text; `fromDocx` marks Word imports. */
  onText: (text: string, fromDocx: boolean) => void;
  /** Insert an image at the cursor. */
  onImageInsert: (dataUrl: string) => void;
}

export type FileImporter = (file: File) => Promise<void>;

/** One path for every way a file arrives: drop, Open…, (later) share target. */
export const createFileImporter = (deps: FileImportDeps): FileImporter => {
  const compress = (file: File) =>
    deps.compressImage(file, { maxDim: IMAGE_MAX_DIM, quality: IMAGE_QUALITY });

  const importDocx = async (file: File) => {
    showToast(`Importing ${file.name}…`);
    const { html, images, skippedImages } = await deps.docxReader.toHtml(
      await file.arrayBuffer(),
      // Same resize/compress as a dropped image, so photos don't bloat the link.
      async (bytes, type) => {
        const image = new File([bytes as BlobPart], 'image', { type });
        return (await compress(image)).dataUrl;
      },
    );
    deps.onText(await deps.htmlToMarkdown.convert(html), true);
    showToast(describeDocxImport(file.name, images, skippedImages), true);
  };

  const importImage = async (file: File) => {
    if (!window.confirm(IMAGE_EMBED_CONFIRM)) return;
    const { dataUrl, bytes, originalBytes } = await compress(file);
    deps.onImageInsert(dataUrl);
    showToast(`Image embedded: ${fmtBytes(originalBytes)} → ${fmtBytes(bytes)}`, true);
  };

  return async (file) => {
    const kind = fileKind(file.name, file.type);
    try {
      if (kind === 'text') {
        deps.onText(await file.text(), false);
        showToast(`Loaded ${file.name}`, true);
      } else if (kind === 'docx') {
        await importDocx(file);
      } else if (kind === 'image') {
        await importImage(file);
      } else {
        showToast('Open a Markdown, text, Word (.docx), or image file');
      }
    } catch {
      showToast(`Could not read ${file.name}`);
    }
  };
};

/** The Open… button: a hidden file input behind a normal button. */
export const initOpenFile = (importFile: FileImporter): void => {
  const button = document.getElementById('btn-open');
  if (!button) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = OPENABLE_TYPES;
  input.hidden = true;
  document.body.append(input);
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) void importFile(file);
  });
};
