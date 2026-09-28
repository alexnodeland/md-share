import type { DocModel } from '../docModel.ts';
import { deriveFilename, documentTitle } from '../filename.ts';
import type { Clipboard, DocxWriter, Printer, Rasterizer } from '../ports.ts';
import { buildStandaloneHtml } from '../standaloneHtml.ts';
import type { Theme } from '../types.ts';
import { closeAllDropdowns } from './dropdown.ts';
import { expandDetails } from './expandDetails.ts';
import { showToast } from './toast.ts';

export interface ExportDeps {
  printer: Printer;
  clipboard: Clipboard;
  getTheme: () => Theme;
  docxWriter: DocxWriter;
  rasterizer: Rasterizer;
  getDocModel: () => DocModel;
  /** The document as a standalone .tex file. */
  getLatex: () => string;
  getKatexVersion: () => string | null;
  getSource: () => string;
  getPreviewHTML: () => string;
  getPreviewElement: () => HTMLElement | null;
  onPresent: () => void;
}

const download = (blob: Blob, name: string): void => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

// The bundled KaTeX sheet uses relative font URLs that break in a standalone
// file; the export links the version-pinned CDN copy instead.
const isKatexSheet = (sheet: CSSStyleSheet): boolean => {
  const owner = sheet.ownerNode as Element | null;
  return /katex/i.test(sheet.href ?? owner?.getAttribute('data-vite-dev-id') ?? '');
};

/** Same-origin rules only; cross-origin sheets (fonts) are linked instead. */
const collectAppCss = (): string => {
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    if (isKatexSheet(sheet)) continue;
    try {
      for (const rule of Array.from(sheet.cssRules)) out.push(rule.cssText);
    } catch {
      // Cross-origin stylesheet: its rules are not readable.
    }
  }
  return out.join('\n');
};

export const initExportMenu = (deps: ExportDeps): void => {
  const btnMd = document.getElementById('btn-export-md');
  const btnHtml = document.getElementById('btn-export-html');
  const btnDocx = document.getElementById('btn-export-docx');
  const btnCopy = document.getElementById('btn-copy-rich');
  const btnPng = document.getElementById('btn-export-png');
  const btnPdf = document.getElementById('btn-export-pdf');
  const btnPresent = document.getElementById('btn-present');
  if (!btnMd || !btnHtml || !btnDocx || !btnCopy || !btnPng || !btnPdf || !btnPresent) return;

  btnPresent.addEventListener('click', () => {
    closeAllDropdowns();
    deps.onPresent();
  });

  document.getElementById('btn-export-tex')?.addEventListener('click', () => {
    closeAllDropdowns();
    const source = deps.getSource();
    download(
      new Blob([deps.getLatex()], { type: 'application/x-tex' }),
      deriveFilename(source, 'tex'),
    );
    showToast('LaTeX exported', true);
  });

  btnMd.addEventListener('click', () => {
    closeAllDropdowns();
    const source = deps.getSource();
    download(new Blob([source], { type: 'text/markdown' }), deriveFilename(source, 'md'));
    showToast('Markdown exported', true);
  });

  btnDocx.addEventListener('click', () => {
    closeAllDropdowns();
    showToast('Building Word document…');
    const source = deps.getSource();
    // By container, not by <svg>: a diagram that failed to render has no SVG
    // and must not shift the rest onto the wrong index.
    const containers = Array.from(
      deps.getPreviewElement()?.querySelectorAll('.mermaid-container') ?? [],
    );
    deps.docxWriter
      .write(deps.getDocModel(), {
        title: documentTitle(source),
        image: (src) => deps.rasterizer.image(src),
        diagram: async (index) => {
          const svg = containers[index]?.querySelector('svg');
          return svg ? deps.rasterizer.svg(svg, 2) : null;
        },
      })
      .then((blob) => {
        download(blob, deriveFilename(source, 'docx'));
        showToast('Word document exported', true);
      })
      .catch(() => showToast('Word export failed'));
  });

  btnHtml.addEventListener('click', () => {
    closeAllDropdowns();
    const source = deps.getSource();
    const doc = buildStandaloneHtml({
      title: documentTitle(source),
      bodyHtml: deps.getPreviewHTML(),
      css: collectAppCss(),
      theme: deps.getTheme(),
      katexVersion: deps.getKatexVersion(),
    });
    download(new Blob([doc], { type: 'text/html' }), deriveFilename(source, 'html'));
    showToast('HTML page exported', true);
  });

  btnCopy.addEventListener('click', () => {
    closeAllDropdowns();
    deps.clipboard
      .writeRich(deps.getPreviewHTML(), deps.getSource())
      .then(() => showToast('Copied — paste into a doc or email', true))
      .catch(() => showToast('Copy failed'));
  });

  btnPng.addEventListener('click', async () => {
    closeAllDropdowns();
    showToast('Rendering PNG…');
    const preview = deps.getPreviewElement();
    if (!preview) {
      showToast('PNG export failed');
      return;
    }
    const restore = expandDetails(preview);
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
    } finally {
      restore();
    }
  });

  btnPdf.addEventListener('click', () => {
    closeAllDropdowns();
    deps.printer.print();
  });
};
