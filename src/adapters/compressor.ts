import LZString from 'lz-string';
import type { Compressor } from '../ports.ts';

/**
 * Payload format: `<tag>.<base64url body>`.
 *
 * - `dd1.` deflate-raw against a preset dictionary of Markdown syntax and common
 *   English (src/assets/link-dictionary-v1.txt, frozen), via fflate: ~10–20%
 *   shorter than `df1.`. Loaded on demand; any browser decodes it.
 * - `df1.` deflate-raw — the browser's own compressor; no gzip header/trailer,
 *   so URLs are ~24 chars shorter than `gz1.`.
 * - `lz1.` lz-string — pure JS; wins on very short documents.
 * - `gz1.` gzip — decode only (older links).
 * - `br1.` brotli — decode only, where the browser supports it.
 * - untagged — legacy lz-string.
 */
type StreamFormat = 'deflate-raw' | 'gzip' | 'brotli';

const STREAM_TAGS: Record<string, StreamFormat> = {
  df1: 'deflate-raw',
  gz1: 'gzip',
  br1: 'brotli',
};

const supports = (format: StreamFormat): boolean => {
  if (typeof CompressionStream === 'undefined') return false;
  try {
    new CompressionStream(format as CompressionFormat);
    return true;
  } catch {
    return false;
  }
};

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlToBytes = (s: string): Uint8Array => {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const pipe = async (
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
): Promise<Uint8Array> => {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const encodeStream = async (text: string, format: StreamFormat, tag: string): Promise<string> => {
  const bytes = await pipe(
    new TextEncoder().encode(text),
    new CompressionStream(format as CompressionFormat),
  );
  return `${tag}.${bytesToBase64Url(bytes)}`;
};

const decodeStream = async (body: string, format: StreamFormat): Promise<string | null> => {
  try {
    const stream = new DecompressionStream(format as CompressionFormat);
    const bytes = await pipe(base64UrlToBytes(body), stream);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
};

interface DictCodec {
  deflate(bytes: Uint8Array): Uint8Array;
  inflate(bytes: Uint8Array): Uint8Array;
}

let dictCodec: Promise<DictCodec> | null = null;

/** fflate plus the v1 dictionary (~25 KB gzipped), fetched once, on first use. */
export const loadDictCodec = (): Promise<DictCodec> => {
  dictCodec ??= Promise.all([import('fflate'), import('../assets/link-dictionary-v1.txt?raw')])
    .then(([{ deflateSync, inflateSync }, { default: text }]) => {
      const dictionary = new TextEncoder().encode(text);
      return {
        deflate: (bytes: Uint8Array) => deflateSync(bytes, { level: 9, mem: 12, dictionary }),
        inflate: (bytes: Uint8Array) => inflateSync(bytes, { dictionary }),
      };
    })
    .catch((err: unknown) => {
      dictCodec = null; // e.g. offline before the chunk was cached: try again next time
      throw err;
    });
  return dictCodec;
};

const encodeDict = async (text: string): Promise<string | null> => {
  try {
    const codec = await loadDictCodec();
    return `dd1.${bytesToBase64Url(codec.deflate(new TextEncoder().encode(text)))}`;
  } catch {
    return null; // the other encodings still work
  }
};

const decodeDict = async (body: string): Promise<string | null> => {
  try {
    const codec = await loadDictCodec();
    return new TextDecoder('utf-8', { fatal: true }).decode(codec.inflate(base64UrlToBytes(body)));
  } catch {
    return null;
  }
};

const decodeLz = (body: string): string | null => {
  try {
    return LZString.decompressFromEncodedURIComponent(body) || null;
  } catch {
    return null;
  }
};

const encodeLz = (text: string): string => `lz1.${LZString.compressToEncodedURIComponent(text)}`;

const shortest = ([first, ...rest]: [string, ...(string | null)[]]): string =>
  rest.reduce<string>((best, c) => (c !== null && c.length < best.length ? c : best), first);

export const createCompressor = (
  canDeflate = supports('deflate-raw'),
  useDictionary = true,
): Compressor => ({
  encode: async (text) => {
    const [lz, df, dd] = await Promise.all([
      encodeLz(text),
      canDeflate ? encodeStream(text, 'deflate-raw', 'df1') : null,
      useDictionary ? encodeDict(text) : null,
    ]);
    // Strictly shorter wins, so ties keep the older, more widely decodable format.
    return shortest([df ?? lz, lz, dd]);
  },
  decode: async (payload) => {
    const dot = payload.indexOf('.');
    if (dot === -1) return decodeLz(payload);
    const tag = payload.slice(0, dot);
    const body = payload.slice(dot + 1);
    if (tag === 'lz1') return decodeLz(body);
    if (tag === 'dd1') return decodeDict(body);
    const format = STREAM_TAGS[tag];
    return format ? decodeStream(body, format) : null;
  },
});

export const browserCompressor: Compressor = createCompressor();
