import type { Clipboard, Compressor, Location } from '../ports.ts';
import { buildShareURL } from '../share.ts';
import type { Flavor } from '../types.ts';
import { showToast } from './toast.ts';

const SAFE_URL_LENGTH = 8000;

export interface ShareDeps {
  compressor: Compressor;
  clipboard: Clipboard;
  location: Location;
  getSource: () => string;
  getFlavor: () => Flavor;
}

export const initShareModal = (deps: ShareDeps): void => {
  const modal = document.getElementById('share-modal');
  const urlBox = document.getElementById('share-url');
  const warn = document.getElementById('url-warn');
  const openBtn = document.getElementById('btn-share');
  const closeBtn = document.getElementById('btn-share-close');
  const copyBtn = document.getElementById('btn-share-copy');
  if (!modal || !urlBox || !warn || !openBtn || !closeBtn || !copyBtn) return;

  const buildURL = () =>
    buildShareURL(deps.location, deps.getSource(), deps.getFlavor(), deps.compressor);

  const open = () => {
    const url = buildURL();
    urlBox.textContent = url;
    warn.textContent =
      url.length > SAFE_URL_LENGTH
        ? `⚠ URL is ${url.length.toLocaleString()} chars — may exceed browser limits.`
        : `URL length: ${url.length.toLocaleString()} chars`;
    warn.className = url.length > SAFE_URL_LENGTH ? 'url-warn over' : 'url-warn';
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
