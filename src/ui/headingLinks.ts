import type { Clipboard } from '../ports.ts';
import { showToast } from './toast.ts';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

export interface HeadingLinksDeps {
  clipboard: Clipboard;
}

export const initHeadingLinks = ({ clipboard }: HeadingLinksDeps): void => {
  const preview = document.getElementById('preview');
  if (!preview) return;

  preview.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target || target.closest('a, code, pre')) return;
    const heading = target.closest(HEADING_SELECTOR) as HTMLElement | null;
    if (!heading || !preview.contains(heading) || !heading.id) return;

    const base = window.location.href.split('#')[0] ?? window.location.href;
    const url = `${base}#${heading.id}`;
    clipboard
      .write(url)
      .then(() => showToast('Heading link copied', true))
      .catch(() => showToast('Copy failed'));
  });
};
