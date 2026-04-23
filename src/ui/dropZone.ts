import type { ImageCompressor } from '../adapters/imageCompress.ts';
import { isUnsafeImageMime } from '../imageEmbed.ts';
import type { DocxToMd } from '../ports.ts';
import { fmtBytes, IMAGE_EMBED_CONFIRM, IMAGE_MAX_DIM, IMAGE_QUALITY } from './imageConsts.ts';
import { showToast } from './toast.ts';

const TEXT_EXT = /\.(md|markdown|txt)$/i;
const DOCX_EXT = /\.docx$/i;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const isTextFile = (file: File) => TEXT_EXT.test(file.name) || file.type.startsWith('text/');
const isImageFile = (file: File) => file.type.startsWith('image/');
const isDocxFile = (file: File) => DOCX_EXT.test(file.name) || file.type === DOCX_MIME;

export interface DropZoneDeps {
  onText: (content: string) => void;
  onImageInsert: (dataUrl: string) => void;
  compressImage: ImageCompressor;
  docxToMd?: DocxToMd;
}

export const initDropZone = ({
  onText,
  onImageInsert,
  compressImage,
  docxToMd,
}: DropZoneDeps): void => {
  const overlay = document.getElementById('drop-overlay');
  if (!overlay) return;

  let depth = 0;

  document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    depth++;
    overlay.classList.add('visible');
  });

  document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (--depth <= 0) {
      depth = 0;
      overlay.classList.remove('visible');
    }
  });

  document.addEventListener('dragover', (e) => e.preventDefault());

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    depth = 0;
    overlay.classList.remove('visible');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (isTextFile(file)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === 'string') {
          onText(result);
          showToast(`Loaded ${file.name}`, true);
        }
      };
      reader.readAsText(file);
      return;
    }
    if (isImageFile(file)) {
      if (isUnsafeImageMime(file.type)) {
        showToast('SVG images cannot be embedded — they may contain scripts');
        return;
      }
      if (!window.confirm(IMAGE_EMBED_CONFIRM)) return;
      compressImage(file, { maxDim: IMAGE_MAX_DIM, quality: IMAGE_QUALITY })
        .then(({ dataUrl, bytes, originalBytes }) => {
          onImageInsert(dataUrl);
          showToast(`Image embedded: ${fmtBytes(originalBytes)} → ${fmtBytes(bytes)}`, true);
        })
        .catch(() => {
          showToast('Could not embed image — unsupported format');
        });
      return;
    }
    if (isDocxFile(file) && docxToMd) {
      showToast(`Converting ${file.name}…`, true);
      file
        .arrayBuffer()
        .then((buf) => docxToMd.convert(buf))
        .then((md) => {
          if (!md.trim()) {
            showToast('DOCX had no convertible content');
            return;
          }
          onText(md);
          showToast(`Loaded ${file.name}`, true);
        })
        .catch(() => {
          showToast('Could not convert DOCX');
        });
      return;
    }
    showToast('Drop a .md, text, image, or .docx file');
  });
};
