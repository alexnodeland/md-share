import type { Clipboard, Compressor, Location } from '../ports.ts';
import { buildShareURL } from '../share.ts';
import type { Flavor } from '../types.ts';
import { trapFocus } from './focusTrap.ts';
import { showToast } from './toast.ts';

const SOFT_URL_LENGTH = 2000;
const HARD_URL_LENGTH = 8000;

export interface ShareDeps {
  compressor: Compressor;
  clipboard: Clipboard;
  location: Location;
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

  const describeLength = (len: number): { text: string; cls: string } => {
    const n = len.toLocaleString();
    if (len > HARD_URL_LENGTH) {
      return {
        text: `⚠ URL is ${n} chars — likely to exceed browser limits. Consider exporting as Markdown instead.`,
        cls: 'url-warn over',
      };
    }
    if (len > SOFT_URL_LENGTH) {
      return {
        text: `⚠ URL is ${n} chars — may not survive every mobile share sheet.`,
        cls: 'url-warn soft',
      };
    }
    return { text: `URL length: ${n} chars`, cls: 'url-warn' };
  };

  const refreshURL = async () => {
    const gen = ++refreshGen;
    const url = await buildURL();
    if (gen !== refreshGen) return;
    urlBox.textContent = url;
    const { text, cls } = describeLength(url.length);
    warn.textContent = text;
    warn.className = cls;
  };

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
