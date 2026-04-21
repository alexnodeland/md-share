import type { Compressor, Location } from './ports.ts';
import { type Flavor, isFlavor, type ShareParams } from './types.ts';

export const normalizeSource = (text: string): string => {
  const withoutBom = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const unifiedEol = withoutBom.replace(/\r\n?/g, '\n');
  return unifiedEol.replace(/[ \t\n]+$/, '');
};

export const encodeDoc = (compressor: Compressor, text: string): string =>
  compressor.encode(normalizeSource(text));

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
  const normalized = normalizeSource(source);
  if (!normalized) {
    return anchor ? `${base}#${encodeURIComponent(anchor)}` : base;
  }
  const encoded = compressor.encode(normalized);
  const parts = [`d=${encoded}`];
  if (flavor !== 'commonmark') parts.push(`f=${flavor}`);
  if (anchor) parts.push(`a=${encodeURIComponent(anchor)}`);
  return `${base}#${parts.join('&')}`;
};

const stripHashFragment = (raw: string): string => (raw.startsWith('#') ? raw.slice(1) : raw);

export const parseShareParams = (
  search: string,
  compressor: Compressor,
  hash = '',
): ShareParams => {
  const rawHash = stripHashFragment(hash);
  const hashParams = new URLSearchParams(rawHash);
  const payloadInHash = hashParams.has('d');
  const params = payloadInHash ? hashParams : new URLSearchParams(search);

  const encoded = params.get('d');
  const flavorRaw = params.get('f');
  const source = encoded ? decodeDoc(compressor, encoded) : null;
  const flavor = isFlavor(flavorRaw) ? flavorRaw : null;

  let anchor: string | null = null;
  if (payloadInHash) {
    anchor = hashParams.get('a');
  } else if (rawHash) {
    try {
      anchor = decodeURIComponent(rawHash);
    } catch {
      anchor = rawHash;
    }
  }
  return { source, flavor, anchor };
};
