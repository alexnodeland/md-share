import LZString from 'lz-string';
import type { Compressor } from '../ports.ts';

/**
 * Payload format: `<tag>.<base64url body>`.
 *
 * - `df1.` deflate-raw — preferred: every modern browser decodes it, and it has
 *   no gzip header/trailer, so URLs are ~24 chars shorter than `gz1.`.
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

const decodeLz = (body: string): string | null => {
  try {
    return LZString.decompressFromEncodedURIComponent(body) || null;
  } catch {
    return null;
  }
};

const encodeLz = (text: string): string => `lz1.${LZString.compressToEncodedURIComponent(text)}`;

export const createCompressor = (canDeflate = supports('deflate-raw')): Compressor => ({
  encode: async (text) => {
    const lz = encodeLz(text);
    if (!canDeflate) return lz;
    const df = await encodeStream(text, 'deflate-raw', 'df1');
    return df.length <= lz.length ? df : lz;
  },
  decode: async (payload) => {
    const dot = payload.indexOf('.');
    if (dot === -1) return decodeLz(payload);
    const tag = payload.slice(0, dot);
    const body = payload.slice(dot + 1);
    if (tag === 'lz1') return decodeLz(body);
    const format = STREAM_TAGS[tag];
    return format ? decodeStream(body, format) : null;
  },
});

export const browserCompressor: Compressor = createCompressor();
