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
): string => {
  const base = loc.origin + loc.pathname;
  if (!source.trim()) return base;
  const encoded = encodeDoc(compressor, source);
  const flavorSuffix = flavor !== 'gfm' ? `&f=${flavor}` : '';
  return `${base}?d=${encoded}${flavorSuffix}`;
};

export const parseShareParams = (search: string, compressor: Compressor): ShareParams => {
  const params = new URLSearchParams(search);
  const encoded = params.get('d');
  const flavorRaw = params.get('f');
  const source = encoded ? decodeDoc(compressor, encoded) : null;
  const flavor = isFlavor(flavorRaw) ? flavorRaw : null;
  return { source, flavor };
};
