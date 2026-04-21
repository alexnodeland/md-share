import LZString from 'lz-string';
import type { Compressor } from '../ports.ts';

type StreamAlgo = 'br' | 'gzip';
type EncoderChoice = StreamAlgo | 'lz';

const hasCompressionStream = typeof CompressionStream !== 'undefined';

const canStream = (algo: StreamAlgo): boolean => {
  if (!hasCompressionStream) return false;
  try {
    const Ctor = CompressionStream as unknown as new (format: string) => unknown;
    new Ctor(algo);
    return true;
  } catch {
    return false;
  }
};

const encoderAlgo: EncoderChoice = canStream('br') ? 'br' : canStream('gzip') ? 'gzip' : 'lz';

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

const makeCompressionStream = (algo: StreamAlgo): TransformStream<Uint8Array, Uint8Array> => {
  const Ctor = CompressionStream as unknown as new (
    format: string,
  ) => TransformStream<Uint8Array, Uint8Array>;
  return new Ctor(algo);
};

const makeDecompressionStream = (algo: StreamAlgo): TransformStream<Uint8Array, Uint8Array> => {
  const Ctor = DecompressionStream as unknown as new (
    format: string,
  ) => TransformStream<Uint8Array, Uint8Array>;
  return new Ctor(algo);
};

const compressBytes = async (text: string, algo: StreamAlgo): Promise<Uint8Array> => {
  const input = new TextEncoder().encode(text);
  const stream = new Blob([input as BlobPart]).stream().pipeThrough(makeCompressionStream(algo));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
};

const decompressBytes = async (bytes: Uint8Array, algo: StreamAlgo): Promise<string> => {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(makeDecompressionStream(algo));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
};

const encodeWithStream = async (text: string, algo: StreamAlgo): Promise<string> => {
  const bytes = await compressBytes(text, algo);
  const tag = algo === 'br' ? 'br1' : 'gz1';
  return `${tag}.${bytesToBase64Url(bytes)}`;
};

const encodeWithLz = (text: string): string =>
  `lz1.${LZString.compressToEncodedURIComponent(text)}`;

const decodeLegacyLz = (text: string): string | null =>
  LZString.decompressFromEncodedURIComponent(text) || null;

const tryStreamDecode = async (body: string, algo: StreamAlgo): Promise<string | null> => {
  try {
    return await decompressBytes(base64UrlToBytes(body), algo);
  } catch {
    return null;
  }
};

const tryLzDecode = (body: string): string | null => {
  try {
    return decodeLegacyLz(body);
  } catch {
    return null;
  }
};

export const browserCompressor: Compressor = {
  encode: (text) =>
    encoderAlgo === 'lz'
      ? Promise.resolve(encodeWithLz(text))
      : encodeWithStream(text, encoderAlgo),
  decode: async (payload) => {
    const dot = payload.indexOf('.');
    if (dot === -1) return tryLzDecode(payload);
    const tag = payload.slice(0, dot);
    const body = payload.slice(dot + 1);
    if (tag === 'br1') return tryStreamDecode(body, 'br');
    if (tag === 'gz1') return tryStreamDecode(body, 'gzip');
    if (tag === 'lz1') return tryLzDecode(body);
    return null;
  },
};
