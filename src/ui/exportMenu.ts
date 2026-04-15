import html2canvas from 'html2canvas';
import type { Printer } from '../ports.ts';
import { closeAllDropdowns } from './dropdown.ts';
import { showToast } from './toast.ts';

export interface ExportDeps {
  printer: Printer;
  getSource: () => string;
  getPreviewHTML: () => string;
  getPreviewElement: () => HTMLElement | null;
}

const download = (blob: Blob, name: string): void => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const initExportMenu = (deps: ExportDeps): void => {
  const btnMd = document.getElementById('btn-export-md');
  const btnHtml = document.getElementById('btn-export-html');
  const btnPng = document.getElementById('btn-export-png');
  const btnPdf = document.getElementById('btn-export-pdf');
  if (!btnMd || !btnHtml || !btnPng || !btnPdf) return;

  btnMd.addEventListener('click', () => {
    closeAllDropdowns();
    download(new Blob([deps.getSource()], { type: 'text/markdown' }), 'document.md');
    showToast('Markdown exported', true);
  });

  btnHtml.addEventListener('click', () => {
    closeAllDropdowns();
    const body = deps.getPreviewHTML();
    const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title></head><body>${body}</body></html>`;
    download(new Blob([doc], { type: 'text/html' }), 'document.html');
    showToast('HTML exported', true);
  });

  btnPng.addEventListener('click', async () => {
    closeAllDropdowns();
    showToast('Rendering PNG…');
    const preview = deps.getPreviewElement();
    if (!preview) {
      showToast('PNG export failed');
      return;
    }
    try {
      const canvas = await html2canvas(preview, {
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--preview-bg')
          .trim(),
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob((blob) => {
        if (blob) {
          download(blob, 'document.png');
          showToast('PNG exported', true);
        }
      });
    } catch {
      showToast('PNG export failed');
    }
  });

  btnPdf.addEventListener('click', () => {
    closeAllDropdowns();
    deps.printer.print();
  });
};
