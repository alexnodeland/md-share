import { showToast } from './toast.ts';

const TEXT_EXT = /\.(md|markdown|txt)$/i;

const isTextFile = (file: File) => TEXT_EXT.test(file.name) || file.type.startsWith('text/');

export interface DropZoneDeps {
  onText: (content: string) => void;
}

export const initDropZone = ({ onText }: DropZoneDeps): void => {
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
    if (!isTextFile(file)) {
      showToast('Drop a .md or text file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        onText(result);
        showToast(`Loaded ${file.name}`, true);
      }
    };
    reader.readAsText(file);
  });
};
