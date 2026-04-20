import type { ImageCompressor } from '../adapters/imageCompress.ts';
import { fmtBytes, IMAGE_EMBED_CONFIRM, IMAGE_MAX_DIM, IMAGE_QUALITY } from './imageConsts.ts';
import { showToast } from './toast.ts';

const TEXT_EXT = /\.(md|markdown|txt)$/i;

const isTextFile = (file: File) => TEXT_EXT.test(file.name) || file.type.startsWith('text/');
const isImageFile = (file: File) => file.type.startsWith('image/');

export interface DropZoneDeps {
  onText: (content: string) => void;
  onImageInsert: (dataUrl: string) => void;
  compressImage: ImageCompressor;
}

export const initDropZone = ({ onText, onImageInsert, compressImage }: DropZoneDeps): void => {
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
    showToast('Drop a .md, text, or image file');
  });
};
