import type { Clipboard, Compressor, Location, NativeShare } from '../ports.ts';
import { fitsInQr, qrSvg } from '../qr.ts';
import { buildShareURL, describeUrlLength } from '../share.ts';
import type { Flavor } from '../types.ts';
import { trapFocus } from './focusTrap.ts';
import { showToast } from './toast.ts';

export interface ShareDeps {
  compressor: Compressor;
  clipboard: Clipboard;
  nativeShare: NativeShare;
  location: Location;
  getTitle: () => string | null;
  getSource: () => string;
  getFlavor: () => Flavor;
  getCurrentHeading: () => string | null;
}

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
  const qrDetails = document.getElementById('link-qr') as HTMLDetailsElement | null;
  const qrBox = document.getElementById('link-qr-code');
  const nativeBtn = document.getElementById('btn-link-native');
  if (
    !modal ||
    !urlBox ||
    !warn ||
    !openBtn ||
    !closeBtn ||
    !copyBtn ||
    !sectionToggle ||
    !sectionCheckbox ||
    !sectionSlug
  )
    return;

  let heading: string | null = null;
  let refreshGen = 0;

  const buildURL = () =>
    buildShareURL(
      deps.location,
      deps.getSource(),
      deps.getFlavor(),
      deps.compressor,
      sectionCheckbox.checked ? heading : null,
    );

  const refreshURL = async () => {
    const gen = ++refreshGen;
    const url = await buildURL();
    if (gen !== refreshGen) return;
    currentUrl = url;
    urlBox.textContent = url;
    const { text, level } = describeUrlLength(url.length);
    warn.textContent = text;
    warn.className = level === 'ok' ? 'url-warn' : `url-warn ${level}`;
    if (qrDetails?.open) void renderQr(url);
  };

  // QR codes are rendered on demand (the encoder is lazy-loaded).
  let currentUrl = '';
  const renderQr = async (url: string) => {
    if (!qrBox) return;
    if (!fitsInQr(url)) {
      qrBox.textContent = 'This link is too long to scan reliably — use Copy or Share instead.';
      return;
    }
    const { encode } = await import('uqr');
    if (url !== currentUrl) return;
    qrBox.innerHTML = qrSvg(
      encode(url, { ecc: 'L', border: 0 }).data,
      'QR code for the share link',
    );
  };
  qrDetails?.addEventListener('toggle', () => {
    if (qrDetails.open && currentUrl) void renderQr(currentUrl);
  });

  if (nativeBtn && deps.nativeShare.isAvailable()) {
    nativeBtn.hidden = false;
    nativeBtn.addEventListener('click', () => {
      buildURL()
        .then((url) =>
          deps.nativeShare.share({ title: deps.getTitle() ?? 'md-share document', url }),
        )
        .then(close)
        .catch((err: unknown) => {
          // Dismissing the share sheet rejects with AbortError — not a failure.
          if (err instanceof DOMException && err.name === 'AbortError') return;
          showToast('Sharing failed — use Copy URL instead');
        });
    });
  }

  let previousFocus: HTMLElement | null = null;

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

  trapFocus(modal, isOpen);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close();
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      open();
    }
  });
};
