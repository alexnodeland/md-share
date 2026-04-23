import type { Clipboard, Compressor, Location, QrEncoder } from '../ports.ts';
import { buildQr } from '../qr.ts';
import { buildShareURL } from '../share.ts';
import { describeShareSize, formatBytes } from '../shareSize.ts';
import type { Flavor } from '../types.ts';
import { showToast } from './toast.ts';

export interface ShareDeps {
  compressor: Compressor;
  clipboard: Clipboard;
  location: Location;
  qrEncoder: QrEncoder;
  getSource: () => string;
  getFlavor: () => Flavor;
  getCurrentHeading: () => string | null;
}

const QR_CANVAS_PX = 160;

export const initShareModal = (deps: ShareDeps): void => {
  const modal = document.getElementById('link-modal');
  const urlBox = document.getElementById('link-url');
  const warn = document.getElementById('url-warn');
  const openBtn = document.getElementById('btn-link');
  const closeBtn = document.getElementById('btn-link-close');
  const copyBtn = document.getElementById('btn-link-copy');
  const sectionToggle = document.getElementById('link-section-toggle');
  const sectionCheckbox = document.getElementById('link-section-check') as HTMLInputElement | null;
  const sectionSlug = document.getElementById('link-section-slug');
  const qrMount = document.getElementById('link-qr');
  if (
    !modal ||
    !urlBox ||
    !warn ||
    !openBtn ||
    !closeBtn ||
    !copyBtn ||
    !sectionToggle ||
    !sectionCheckbox ||
    !sectionSlug ||
    !qrMount
  )
    return;

  let heading: string | null = null;
  let refreshGen = 0;
  let qrGen = 0;

  const buildURL = () =>
    buildShareURL(
      deps.location,
      deps.getSource(),
      deps.getFlavor(),
      deps.compressor,
      sectionCheckbox.checked ? heading : null,
    );

  const renderMeter = (url: string): void => {
    const size = describeShareSize(url);
    const pct = Math.round(size.ratio * 100);
    warn.className = `url-warn band-${size.band}`;
    warn.innerHTML = '';
    const label = document.createElement('div');
    label.className = 'url-warn-label';
    label.textContent = `URL size: ${formatBytes(size.bytes)}`;
    const bar = document.createElement('div');
    bar.className = 'url-warn-bar';
    const fill = document.createElement('div');
    fill.className = 'url-warn-bar-fill';
    fill.style.width = `${pct}%`;
    bar.append(fill);
    warn.append(label, bar);
    if (size.suggestions.length > 0) {
      const list = document.createElement('ul');
      list.className = 'url-warn-tips';
      for (const s of size.suggestions) {
        const li = document.createElement('li');
        li.dataset.suggestion = s.id;
        li.textContent = s.message;
        list.append(li);
      }
      warn.append(list);
    }
  };

  const paintQrMessage = (text: string): void => {
    qrMount.textContent = '';
    const msg = document.createElement('div');
    msg.className = 'link-qr-msg';
    msg.textContent = text;
    qrMount.append(msg);
  };

  const paintQr = async (url: string): Promise<void> => {
    const gen = ++qrGen;
    try {
      const { matrix, modulesPerSide } = await buildQr(deps.qrEncoder, url);
      if (gen !== qrGen) return;
      const canvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      const pixelSize = QR_CANVAS_PX * dpr;
      canvas.width = pixelSize;
      canvas.height = pixelSize;
      canvas.style.width = `${QR_CANVAS_PX}px`;
      canvas.style.height = `${QR_CANVAS_PX}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        paintQrMessage('QR unavailable');
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pixelSize, pixelSize);
      const cell = pixelSize / modulesPerSide;
      ctx.fillStyle = '#000000';
      for (let r = 0; r < modulesPerSide; r++) {
        const row = matrix[r];
        if (!row) continue;
        for (let c = 0; c < modulesPerSide; c++) {
          if (row[c])
            ctx.fillRect(
              Math.floor(c * cell),
              Math.floor(r * cell),
              Math.ceil(cell),
              Math.ceil(cell),
            );
        }
      }
      qrMount.textContent = '';
      qrMount.append(canvas);
    } catch {
      if (gen !== qrGen) return;
      paintQrMessage('URL too long for QR');
    }
  };

  const refreshURL = async () => {
    const gen = ++refreshGen;
    const url = await buildURL();
    if (gen !== refreshGen) return;
    urlBox.textContent = url;
    renderMeter(url);
    void paintQr(url);
  };

  let previousFocus: HTMLElement | null = null;

  const focusables = (): HTMLElement[] => [copyBtn as HTMLElement, closeBtn as HTMLElement];

  const open = () => {
    heading = deps.getCurrentHeading();
    sectionCheckbox.checked = false;
    if (heading) {
      sectionToggle.hidden = false;
      sectionSlug.textContent = heading;
    } else {
      sectionToggle.hidden = true;
    }
    void refreshURL();
    previousFocus = (document.activeElement as HTMLElement) ?? null;
    modal.classList.add('open');
    copyBtn.focus();
  };

  const close = () => {
    modal.classList.remove('open');
    previousFocus?.focus?.();
    previousFocus = null;
  };

  const isOpen = () => modal.classList.contains('open');

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  sectionCheckbox.addEventListener('change', () => {
    void refreshURL();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  copyBtn.addEventListener('click', () => {
    buildURL()
      .then((url) => deps.clipboard.write(url))
      .then(() => showToast('URL copied', true))
      .catch(() => showToast('Copy failed — select the URL and copy manually'))
      .finally(close);
  });

  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !isOpen()) return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close();
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      open();
    }
  });
};
