import type MarkdownIt from 'markdown-it';
import { buildBrowserDocx } from '../adapters/docxBuild.ts';
import { markdownToLatex } from '../export/latex.ts';
import { buildStandaloneHtml } from '../export/standaloneHtml.ts';
import { markdownToTypst } from '../export/typst.ts';
import { deriveFilename } from '../filename.ts';
import type { Printer } from '../ports.ts';
import { closeAllDropdowns } from './dropdown.ts';
import { showToast } from './toast.ts';

export interface ExportDeps {
  printer: Printer;
  getSource: () => string;
  getPreviewHTML: () => string;
  getPreviewElement: () => HTMLElement | null;
  getTheme: () => 'dark' | 'light';
  getMd: () => MarkdownIt;
  onPresent: () => void;
}

const collectInlineStyles = (): string => {
  const sheets = Array.from(document.styleSheets);
  const parts: string[] = [];
  for (const sheet of sheets) {
    try {
      for (const rule of Array.from(sheet.cssRules)) parts.push(rule.cssText);
    } catch {
      // cross-origin stylesheets throw on cssRules; skip them
    }
  }
  return parts.join('\n');
};

const deriveTitle = (source: string): string => {
  const match = source.match(/^\s*#\s+(.+)$/m);
  return match ? match[1]!.trim() : 'Document';
};

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
  const btnHtmlStandalone = document.getElementById('btn-export-html-standalone');
  const btnDocx = document.getElementById('btn-export-docx');
  const btnLatex = document.getElementById('btn-export-latex');
  const btnTypst = document.getElementById('btn-export-typst');
  const btnPng = document.getElementById('btn-export-png');
  const btnPdf = document.getElementById('btn-export-pdf');
  const btnPresent = document.getElementById('btn-present');
  if (
    !btnMd ||
    !btnHtml ||
    !btnHtmlStandalone ||
    !btnDocx ||
    !btnLatex ||
    !btnTypst ||
    !btnPng ||
    !btnPdf ||
    !btnPresent
  )
    return;

  btnPresent.addEventListener('click', () => {
    closeAllDropdowns();
    deps.onPresent();
  });

  btnMd.addEventListener('click', () => {
    closeAllDropdowns();
    const source = deps.getSource();
    download(new Blob([source], { type: 'text/markdown' }), deriveFilename(source, 'md'));
    showToast('Markdown exported', true);
  });

  btnHtml.addEventListener('click', () => {
    closeAllDropdowns();
    const source = deps.getSource();
    const body = deps.getPreviewHTML();
    const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title></head><body>${body}</body></html>`;
    download(new Blob([doc], { type: 'text/html' }), deriveFilename(source, 'html'));
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
      const { default: html2canvas } = await import('html2canvas');
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
          download(blob, deriveFilename(deps.getSource(), 'png'));
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

  btnHtmlStandalone.addEventListener('click', () => {
    closeAllDropdowns();
    const source = deps.getSource();
    const body = deps.getPreviewHTML();
    const title = deriveTitle(source);
    const css = collectInlineStyles();
    const doc = buildStandaloneHtml({ title, body, css, theme: deps.getTheme() });
    download(new Blob([doc], { type: 'text/html' }), deriveFilename(source, 'html'));
    showToast('Standalone HTML exported', true);
  });

  btnDocx.addEventListener('click', async () => {
    closeAllDropdowns();
    showToast('Building .docx…');
    const source = deps.getSource();
    const body = deps.getPreviewHTML();
    const title = deriveTitle(source);
    try {
      const blob = await buildBrowserDocx({ title, body, css: '' });
      download(blob, deriveFilename(source, 'docx'));
      showToast('Word document exported', true);
    } catch {
      showToast('DOCX export failed');
    }
  });

  btnLatex.addEventListener('click', () => {
    closeAllDropdowns();
    const source = deps.getSource();
    const tex = markdownToLatex(source, deps.getMd());
    download(new Blob([tex], { type: 'application/x-tex' }), deriveFilename(source, 'tex'));
    showToast('LaTeX exported', true);
  });

  btnTypst.addEventListener('click', () => {
    closeAllDropdowns();
    const source = deps.getSource();
    const typ = markdownToTypst(source, deps.getMd());
    download(new Blob([typ], { type: 'text/plain' }), deriveFilename(source, 'typ'));
    showToast('Typst exported', true);
  });
};
