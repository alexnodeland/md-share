import type { FileImporter } from './fileImport.ts';

// Only file drags are ours; text drags (moving a selection in the editor,
// dropping text from another app) keep the browser's native behavior.
const carriesFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false;

export const initDropZone = (importFile: FileImporter): void => {
  const overlay = document.getElementById('drop-overlay');
  if (!overlay) return;

  let depth = 0;

  document.addEventListener('dragenter', (e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    depth++;
    overlay.classList.add('visible');
  });

  document.addEventListener('dragleave', (e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    if (--depth <= 0) {
      depth = 0;
      overlay.classList.remove('visible');
    }
  });

  document.addEventListener('dragover', (e) => {
    if (carriesFiles(e)) e.preventDefault();
  });

  document.addEventListener('drop', (e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    depth = 0;
    overlay.classList.remove('visible');
    const file = e.dataTransfer?.files?.[0];
    if (file) void importFile(file);
  });
};
