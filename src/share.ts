import type { Compressor, Location } from './ports.ts';
import { type Flavor, isFlavor, type ShareParams } from './types.ts';

export const normalizeSource = (text: string): string => {
  const withoutBom = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const unifiedEol = withoutBom.replace(/\r\n?/g, '\n');
  return unifiedEol.replace(/[ \t\n]+$/, '');
};

export const encodeDoc = (compressor: Compressor, text: string): Promise<string> =>
  compressor.encode(normalizeSource(text));

export const decodeDoc = (compressor: Compressor, encoded: string): Promise<string | null> =>
  compressor.decode(encoded).catch(() => null);

export const buildShareURL = async (
  loc: Location,
  source: string,
  flavor: Flavor,
  compressor: Compressor,
  anchor: string | null = null,
): Promise<string> => {
  const base = loc.origin + loc.pathname;
  const normalized = normalizeSource(source);
  if (!normalized) {
    return anchor ? `${base}#${encodeURIComponent(anchor)}` : base;
  }
  const encoded = await compressor.encode(normalized);
  const parts = [`d=${encoded}`];
  if (flavor !== 'commonmark') parts.push(`f=${flavor}`);
  if (anchor) parts.push(`a=${encodeURIComponent(anchor)}`);
  return `${base}#${parts.join('&')}`;
};

const stripHashFragment = (raw: string): string => (raw.startsWith('#') ? raw.slice(1) : raw);

export const hasSharePayload = (hash: string, search = ''): boolean =>
  new URLSearchParams(stripHashFragment(hash)).has('d') || new URLSearchParams(search).has('d');

export const parseShareParams = async (
  search: string,
  compressor: Compressor,
  hash = '',
): Promise<ShareParams> => {
  const rawHash = stripHashFragment(hash);
  const hashParams = new URLSearchParams(rawHash);
  const payloadInHash = hashParams.has('d');
  const params = payloadInHash ? hashParams : new URLSearchParams(search);

  const encoded = params.get('d');
  const flavorRaw = params.get('f');
  const source = encoded ? await decodeDoc(compressor, encoded) : null;
  // A share link always pins its flavor: `buildShareURL` omits `f=` only for
  // CommonMark, so a payload without one must not fall back to the reader's
  // stored preference.
  const flavor = isFlavor(flavorRaw) ? flavorRaw : source !== null ? 'commonmark' : null;

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

/** Past this, some chat apps, SMS gateways, and QR scanners mangle or refuse the link. */
export const SOFT_URL_LENGTH = 2000;
/** Past this, some browsers and servers truncate URLs outright. */
export const HARD_URL_LENGTH = 8000;

export type UrlLengthLevel = 'ok' | 'soft' | 'over';

export const describeUrlLength = (length: number): { level: UrlLengthLevel; text: string } => {
  const n = length.toLocaleString('en-US');
  if (length > HARD_URL_LENGTH) {
    return {
      level: 'over',
      text: `⚠ URL is ${n} chars — likely to exceed browser limits. Consider exporting as Markdown instead.`,
    };
  }
  if (length > SOFT_URL_LENGTH) {
    return {
      level: 'soft',
      text: `⚠ URL is ${n} chars — may not survive every chat app or QR scanner.`,
    };
  }
  return { level: 'ok', text: `URL length: ${n} chars` };
};
