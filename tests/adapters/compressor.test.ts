// @vitest-environment node
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

describe('browser compressor (adapter)', () => {
  const codec = createCompressor();

  it('round-trips long documents as deflate-raw', async () => {
    const encoded = await codec.encode(LONG);
    expect(encoded.startsWith('df1.')).toBe(true);
    expect(encoded).toMatch(/^df1\.[A-Za-z0-9_-]+$/);
    expect(await codec.decode(encoded)).toBe(LONG);
  });

  it('picks lz-string when it is shorter (tiny documents)', async () => {
    const encoded = await codec.encode('hi');
    expect(encoded.startsWith('lz1.')).toBe(true);
    expect(await codec.decode(encoded)).toBe('hi');
  });

  it('falls back to lz-string without CompressionStream support', async () => {
    const encoded = await createCompressor(false).encode(LONG);
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
