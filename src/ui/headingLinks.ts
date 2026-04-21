import type { Clipboard, Compressor, Location } from '../ports.ts';
import { buildShareURL } from '../share.ts';
import type { Flavor } from '../types.ts';
import { showToast } from './toast.ts';

export interface HeadingLinksDeps {
  clipboard: Clipboard;
  compressor: Compressor;
  location: Location;
  getSource: () => string;
  getFlavor: () => Flavor;
}

export const initHeadingLinks = ({
  clipboard,
  compressor,
  location,
  getSource,
  getFlavor,
}: HeadingLinksDeps): void => {
  const preview = document.getElementById('preview');
  if (!preview) return;

  preview.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest('a.heading-anchor') as HTMLAnchorElement | null;
    if (!anchor || !preview.contains(anchor)) return;
    const heading = anchor.closest('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
    if (!heading?.id) return;

    e.preventDefault();
    const url = buildShareURL(location, getSource(), getFlavor(), compressor, heading.id);
    clipboard
      .write(url)
      .then(() => showToast('Heading link copied', true))
      .catch(() => showToast('Copy failed'));
  });
};
