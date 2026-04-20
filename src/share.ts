import type { Compressor, Location } from './ports.ts';
import { type Flavor, isFlavor, type ShareParams } from './types.ts';

export const encodeDoc = (compressor: Compressor, text: string): string => compressor.encode(text);

export const decodeDoc = (compressor: Compressor, encoded: string): string | null =>
  compressor.decode(encoded);

export const buildShareURL = (
  loc: Location,
  source: string,
  flavor: Flavor,
  compressor: Compressor,
  anchor: string | null = null,
): string => {
  const base = loc.origin + loc.pathname;
  const hash = anchor ? `#${encodeURIComponent(anchor)}` : '';
  if (!source.trim()) return `${base}${hash}`;
  const encoded = encodeDoc(compressor, source);
  const flavorSuffix = flavor !== 'commonmark' ? `&f=${flavor}` : '';
  return `${base}?d=${encoded}${flavorSuffix}${hash}`;
};

const stripHashFragment = (raw: string): string => (raw.startsWith('#') ? raw.slice(1) : raw);

export const parseShareParams = (
  search: string,
  compressor: Compressor,
  hash = '',
): ShareParams => {
  const params = new URLSearchParams(search);
  const encoded = params.get('d');
  const flavorRaw = params.get('f');
  const source = encoded ? decodeDoc(compressor, encoded) : null;
  const flavor = isFlavor(flavorRaw) ? flavorRaw : null;
  const fragment = stripHashFragment(hash);
  let anchor: string | null = null;
  if (fragment) {
    try {
      anchor = decodeURIComponent(fragment);
    } catch {
      anchor = fragment;
    }
  }
  return { source, flavor, anchor };
};
