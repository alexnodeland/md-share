import type { Clipboard, Compressor, Location } from '../ports.ts';
import { buildShareURL } from '../share.ts';
import type { Flavor } from '../types.ts';
import { showToast } from './toast.ts';

const SOFT_URL_LENGTH = 2000;
const HARD_URL_LENGTH = 8000;

export interface ShareDeps {
  compressor: Compressor;
  clipboard: Clipboard;
  location: Location;
  getSource: () => string;
  getFlavor: () => Flavor;
}

export const initShareModal = (deps: ShareDeps): void => {
  const modal = document.getElementById('link-modal');
  const urlBox = document.getElementById('link-url');
  const warn = document.getElementById('url-warn');
  const openBtn = document.getElementById('btn-link');
  const closeBtn = document.getElementById('btn-link-close');
  const copyBtn = document.getElementById('btn-link-copy');
  if (!modal || !urlBox || !warn || !openBtn || !closeBtn || !copyBtn) return;

  const buildURL = () =>
    buildShareURL(deps.location, deps.getSource(), deps.getFlavor(), deps.compressor);

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

  let previousFocus: HTMLElement | null = null;

  const focusables = (): HTMLElement[] => [copyBtn as HTMLElement, closeBtn as HTMLElement];

  const open = () => {
    const url = buildURL();
    urlBox.textContent = url;
    const { text, cls } = describeLength(url.length);
    warn.textContent = text;
    warn.className = cls;
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
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  copyBtn.addEventListener('click', () => {
    deps.clipboard
      .write(buildURL())
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
