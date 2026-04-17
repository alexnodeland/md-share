import type { Clipboard } from '../ports.ts';
import { showToast } from './toast.ts';

export interface HeadingLinksDeps {
  clipboard: Clipboard;
}

export const initHeadingLinks = ({ clipboard }: HeadingLinksDeps): void => {
  const preview = document.getElementById('preview');
  if (!preview) return;

  preview.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest('a.heading-anchor') as HTMLAnchorElement | null;
    if (!anchor || !preview.contains(anchor)) return;
    const heading = anchor.closest('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
    if (!heading?.id) return;

    e.preventDefault();
    const base = window.location.href.split('#')[0] ?? window.location.href;
    const url = `${base}#${heading.id}`;
    clipboard
      .write(url)
      .then(() => showToast('Heading link copied', true))
      .catch(() => showToast('Copy failed'));
  });
};
