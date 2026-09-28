import type { ImageCompressor } from '../adapters/imageCompress.ts';
import {
  describeDocxImport,
  type FileKind,
  fileKind,
  OPENABLE_TYPES,
  PICKER_TYPES,
} from '../fileKind.ts';
import type { DiskFile, DocxReader, FileAccess, HtmlToMarkdown } from '../ports.ts';
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

/** Resolves to what was imported, or null if nothing was (unsupported, declined, unreadable). */
export type FileImporter = (file: File) => Promise<FileKind | null>;

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
    if (!window.confirm(IMAGE_EMBED_CONFIRM)) return false;
    const { dataUrl, bytes, originalBytes } = await compress(file);
    deps.onImageInsert(dataUrl);
    showToast(`Image embedded: ${fmtBytes(originalBytes)} → ${fmtBytes(bytes)}`, true);
    return true;
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
        if (!(await importImage(file))) return null;
      } else {
        showToast('Open a Markdown, text, Word (.docx), or image file');
        return null;
      }
      return kind;
    } catch {
      showToast(`Could not read ${file.name}`);
      return null;
    }
  };
};

export interface OpenFileDeps {
  access: FileAccess;
  /** A Markdown/text file opened in place: saves can go back to it. */
  onOpenedInPlace: (disk: DiskFile) => void;
}

/**
 * The Open… button. Where the browser allows it, the file is opened in place
 * (Ctrl+S writes back); elsewhere, a hidden file input just reads it.
 */
export const initOpenFile = (importFile: FileImporter, deps: OpenFileDeps): void => {
  const button = document.getElementById('btn-open');
  if (!button) return;
  if (deps.access.supported) {
    button.addEventListener('click', async () => {
      try {
        const picked = await deps.access.open(PICKER_TYPES);
        if (picked && (await importFile(picked.file)) === 'text') deps.onOpenedInPlace(picked.disk);
      } catch {
        showToast('Could not open the file');
      }
    });
    return;
  }
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
