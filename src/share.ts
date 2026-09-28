import { escapeHtml } from './escapeHtml.ts';
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
  embed = false,
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
  if (embed) parts.push('e=1');
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
  return { source, flavor, anchor, embed: payloadInHash && hashParams.get('e') === '1' };
};

/** QR codes past this stop scanning reliably; Discord caps messages here too. */
export const SOFT_URL_LENGTH = 2000;
/**
 * Past this, most chat apps refuse or truncate the message. The payload rides
 * in the fragment, which never reaches a server, so server URL limits (~8 KB)
 * don't apply; browsers themselves accept far more (Chromium: 2 MB).
 */
export const LONG_URL_LENGTH = 65_536;

/** Where people paste links, and the longest message each accepts. */
export const LINK_DESTINATIONS: readonly { name: string; max: number }[] = [
  { name: 'a QR code', max: SOFT_URL_LENGTH },
  { name: 'Discord', max: 2000 },
  { name: 'Slack', max: 40_000 },
  { name: 'WhatsApp', max: LONG_URL_LENGTH },
];

export type UrlLengthLevel = 'ok' | 'soft' | 'over';

const joinWords = (items: readonly string[], last: string): string =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${last} ${items.at(-1)}`;

/** How far a link of this length will travel: which apps take it, which don't. */
export const describeUrlLength = (length: number): { level: UrlLengthLevel; text: string } => {
  const n = `Link: ${length.toLocaleString('en-US')} chars`;
  if (length <= SOFT_URL_LENGTH)
    return { level: 'ok', text: `${n} — fits anywhere, even a QR code` };
  if (length > LONG_URL_LENGTH) {
    return {
      level: 'over',
      text: `${n} — opens in browsers, but too long to paste into most chat apps. Send the file instead.`,
    };
  }
  const fits = LINK_DESTINATIONS.filter((d) => length <= d.max).map((d) => d.name);
  const not = LINK_DESTINATIONS.filter((d) => length > d.max).map((d) => d.name);
  return {
    level: 'soft',
    text: `${n} — fits ${joinWords(fits, 'and')}; too long for ${joinWords(not, 'or')}`,
  };
};

/** HTML to paste into a blog or docs site: the rendered document in an iframe. */
export const embedSnippet = (embedUrl: string, title: string | null): string =>
  `<iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(title ?? 'Document')}" width="100%" height="600" style="border:0" loading="lazy"></iframe>`;

/**
 * The Web Share Target (Android "Share → md-share") delivers `title`,
 * `text`, and `url` as query params; turn them into a document. Android
 * often repeats the URL inside `text`, so it is only added once.
 */
export const shareTargetDocument = (search: string): string | null => {
  const params = new URLSearchParams(search);
  const title = params.get('title')?.trim() ?? '';
  const text = params.get('text')?.trim() ?? '';
  const url = params.get('url')?.trim() ?? '';
  const parts = [title && `# ${title}`, text, url && !text.includes(url) ? url : ''].filter(
    Boolean,
  );
  return parts.length ? parts.join('\n\n') : null;
};
