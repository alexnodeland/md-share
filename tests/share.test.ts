import { describe, expect, it } from 'vitest';
import type { Compressor } from '../src/ports.ts';
import { buildShareURL, decodeDoc, encodeDoc, parseShareParams } from '../src/share.ts';

const identityCompressor: Compressor = {
  encode: (text) => encodeURIComponent(text),
  decode: (text) => {
    try {
      return decodeURIComponent(text);
    } catch {
      return null;
    }
  },
};

const nullCompressor: Compressor = {
  encode: (t) => t,
  decode: () => null,
};

const loc = { origin: 'https://md.example', pathname: '/render/' };

describe('encodeDoc / decodeDoc', () => {
  it('round-trips text through the compressor', () => {
    const encoded = encodeDoc(identityCompressor, 'hello world');
    expect(decodeDoc(identityCompressor, encoded)).toBe('hello world');
  });

  it('returns null when the compressor cannot decode', () => {
    expect(decodeDoc(nullCompressor, 'anything')).toBeNull();
  });
});

describe('buildShareURL', () => {
  it('returns the base URL for empty source', () => {
    expect(buildShareURL(loc, '', 'commonmark', identityCompressor)).toBe(
      'https://md.example/render/',
    );
  });

  it('returns the base URL for whitespace-only source', () => {
    expect(buildShareURL(loc, '   \n\t', 'commonmark', identityCompressor)).toBe(
      'https://md.example/render/',
    );
  });

  it('omits the flavor param when flavor is commonmark (the default)', () => {
    const url = buildShareURL(loc, 'hello', 'commonmark', identityCompressor);
    expect(url).toBe('https://md.example/render/?d=hello');
  });

  it('includes the flavor param when flavor is not commonmark', () => {
    const url = buildShareURL(loc, 'hello', 'obsidian', identityCompressor);
    expect(url).toBe('https://md.example/render/?d=hello&f=obsidian');
  });

  it('encodes via the compressor', () => {
    const url = buildShareURL(loc, 'a b', 'gfm', identityCompressor);
    expect(url).toContain('?d=a%20b&f=gfm');
  });
});

describe('parseShareParams', () => {
  it('returns both nulls for empty search', () => {
    expect(parseShareParams('', identityCompressor)).toEqual({
      source: null,
      flavor: null,
      anchor: null,
    });
  });

  it('decodes the source', () => {
    expect(parseShareParams('?d=hello%20world', identityCompressor)).toEqual({
      source: 'hello world',
      flavor: null,
      anchor: null,
    });
  });

  it('extracts a valid flavor', () => {
    expect(parseShareParams('?d=x&f=atlassian', identityCompressor)).toEqual({
      source: 'x',
      flavor: 'atlassian',
      anchor: null,
    });
  });

  it('rejects an unknown flavor', () => {
    expect(parseShareParams('?d=x&f=bogus', identityCompressor)).toEqual({
      source: 'x',
      flavor: null,
      anchor: null,
    });
  });

  it('returns null source when decode fails', () => {
    expect(parseShareParams('?d=garbage', nullCompressor)).toEqual({
      source: null,
      flavor: null,
      anchor: null,
    });
  });

  it('handles search strings without the leading ?', () => {
    expect(parseShareParams('d=hi&f=gfm', identityCompressor)).toEqual({
      source: 'hi',
      flavor: 'gfm',
      anchor: null,
    });
  });

  it('parses a percent-encoded hash fragment as an anchor', () => {
    expect(parseShareParams('?d=x', identityCompressor, '#my%20section')).toEqual({
      source: 'x',
      flavor: null,
      anchor: 'my section',
    });
  });

  it('accepts a hash without a leading #', () => {
    expect(parseShareParams('?d=x', identityCompressor, 'plain-slug')).toEqual({
      source: 'x',
      flavor: null,
      anchor: 'plain-slug',
    });
  });

  it('falls back to the raw fragment when decodeURIComponent fails', () => {
    expect(parseShareParams('', identityCompressor, '#%FF')).toEqual({
      source: null,
      flavor: null,
      anchor: '%FF',
    });
  });
});

describe('buildShareURL with anchor', () => {
  it('appends the anchor to an empty-source base URL', () => {
    expect(buildShareURL(loc, '', 'commonmark', identityCompressor, 'intro')).toBe(
      'https://md.example/render/#intro',
    );
  });

  it('appends the anchor after the query string', () => {
    expect(buildShareURL(loc, 'hi', 'gfm', identityCompressor, 'my section')).toBe(
      'https://md.example/render/?d=hi&f=gfm#my%20section',
    );
  });

  it('omits the anchor when null', () => {
    expect(buildShareURL(loc, 'hi', 'commonmark', identityCompressor, null)).toBe(
      'https://md.example/render/?d=hi',
    );
  });
});
