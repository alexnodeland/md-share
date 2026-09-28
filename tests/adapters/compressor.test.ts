// @vitest-environment node

import { readFileSync } from 'node:fs';
import { brotliCompressSync, deflateRawSync, gzipSync } from 'node:zlib';
import LZString from 'lz-string';
import { describe, expect, it } from 'vitest';
import { createCompressor } from '../../src/adapters/compressor.ts';

const b64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Brotli streams exist in Node 22+ but not Node 20 or any browser yet.
const hasBrotli = (() => {
  try {
    new DecompressionStream('brotli' as CompressionFormat);
    return true;
  } catch {
    return false;
  }
})();

const LONG = `# Notes\n\n${'Markdown is a lightweight markup language. '.repeat(40)}\n\n- [ ] ünïcødé ✓ 日本語`;

const FROZEN_DD1 = 'dd1.U1bwAPVqubhCoMd5AQtdyLQ-rIbWAwA';

const DICTIONARY = readFileSync(
  new URL('../../src/assets/link-dictionary-v1.txt', import.meta.url),
);

describe('browser compressor (adapter)', () => {
  const codec = createCompressor();

  it('round-trips documents with the v1 dictionary when that is shortest', async () => {
    const doc =
      '# Meeting notes\n\n- [ ] Follow up with the team about the project\n- Read [the docs](https://github.com/example)';
    const encoded = await codec.encode(doc);
    expect(encoded).toMatch(/^dd1\.[A-Za-z0-9_-]+$/);
    const plain = await createCompressor(true, false).encode(doc);
    expect(encoded.length).toBeLessThan(plain.length);
    expect(await codec.decode(encoded)).toBe(doc);
  });

  it('decodes dd1 payloads made by any deflate encoder with the same dictionary', async () => {
    const bytes = Buffer.from(LONG, 'utf8');
    const payload = `dd1.${b64url(deflateRawSync(bytes, { dictionary: DICTIONARY }))}`;
    expect(await codec.decode(payload)).toBe(LONG);
  });

  it('keeps decoding a link made today (the dictionary and format are frozen)', async () => {
    // Made by this codec for '# Hello\n\nThis is a shared document.'; must decode forever.
    expect(await codec.decode(FROZEN_DD1)).toBe('# Hello\n\nThis is a shared document.');
  });

  it('returns null for a corrupt dd1 body', async () => {
    expect(await codec.decode('dd1.@@@')).toBeNull();
    expect(await codec.decode('dd1.AAAA')).toBeNull();
  });

  it('round-trips long documents as deflate-raw without the dictionary', async () => {
    const encoded = await createCompressor(true, false).encode(LONG);
    expect(encoded.startsWith('df1.')).toBe(true);
    expect(encoded).toMatch(/^df1\.[A-Za-z0-9_-]+$/);
    expect(await codec.decode(encoded)).toBe(LONG);
  });

  it('picks lz-string when it is shorter (tiny documents)', async () => {
    const encoded = await createCompressor(true, false).encode('hi');
    expect(encoded.startsWith('lz1.')).toBe(true);
    expect(await codec.decode(encoded)).toBe('hi');
  });

  it('falls back to lz-string without CompressionStream support', async () => {
    const encoded = await createCompressor(false, false).encode(LONG);
    expect(encoded.startsWith('lz1.')).toBe(true);
    expect(await codec.decode(encoded)).toBe(LONG);
  });

  it('decodes payloads produced by other encoders', async () => {
    const bytes = Buffer.from(LONG, 'utf8');
    expect(await codec.decode(`df1.${b64url(deflateRawSync(bytes))}`)).toBe(LONG);
    expect(await codec.decode(`gz1.${b64url(gzipSync(bytes))}`)).toBe(LONG);
  });

  it('decodes br1 only where the runtime supports brotli streams', async () => {
    const payload = `br1.${b64url(brotliCompressSync(Buffer.from(LONG, 'utf8')))}`;
    expect(await codec.decode(payload)).toBe(hasBrotli ? LONG : null);
  });

  it('decodes untagged legacy lz-string payloads', async () => {
    expect(await codec.decode(LZString.compressToEncodedURIComponent(LONG))).toBe(LONG);
  });

  it('returns null for unknown tags and corrupt bodies', async () => {
    expect(await codec.decode('zz9.abc')).toBeNull();
    expect(await codec.decode('df1.@@@')).toBeNull();
    expect(await codec.decode('gz1.AAAA')).toBeNull();
    expect(await codec.decode('lz1.')).toBeNull();
  });

  it('rejects bytes that are not valid UTF-8', async () => {
    expect(
      await codec.decode(`df1.${b64url(deflateRawSync(Buffer.from([0xff, 0xfe])))}`),
    ).toBeNull();
  });
});
