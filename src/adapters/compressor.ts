import LZString from 'lz-string';
import type { Compressor } from '../ports.ts';

export const lzStringCompressor: Compressor = {
  encode: (text) => LZString.compressToEncodedURIComponent(text),
  decode: (text) => {
    const result = LZString.decompressFromEncodedURIComponent(text);
    return result || null;
  },
};
