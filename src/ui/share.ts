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

  const open = () => {
    const url = buildURL();
    urlBox.textContent = url;
    const { text, cls } = describeLength(url.length);
    warn.textContent = text;
    warn.className = cls;
    modal.classList.add('open');
  };

  const close = () => modal.classList.remove('open');

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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      open();
    }
  });
};
