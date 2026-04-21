import { describe, expect, it } from 'vitest';
import type { Compressor } from '../src/ports.ts';
import {
  buildShareURL,
  decodeDoc,
  encodeDoc,
  normalizeSource,
  parseShareParams,
} from '../src/share.ts';

const identityCompressor: Compressor = {
  encode: async (text) => encodeURIComponent(text),
  decode: async (text) => {
    try {
      return decodeURIComponent(text);
    } catch {
      return null;
    }
  },
};

const nullCompressor: Compressor = {
  encode: async (t) => t,
  decode: async () => null,
};

const rejectingCompressor: Compressor = {
  encode: async (t) => t,
  decode: async () => {
    throw new Error('decode blew up');
  },
};

const loc = { origin: 'https://md.example', pathname: '/render/' };

describe('normalizeSource', () => {
  it('returns empty input unchanged', () => {
    expect(normalizeSource('')).toBe('');
  });

  it('strips a leading UTF-8 BOM', () => {
    expect(normalizeSource('﻿hello')).toBe('hello');
  });

  it('leaves a non-leading U+FEFF alone', () => {
    expect(normalizeSource('hi﻿there')).toBe('hi﻿there');
  });

  it('converts CRLF line endings to LF', () => {
    expect(normalizeSource('a\r\nb\r\nc')).toBe('a\nb\nc');
  });

  it('converts lone CR line endings to LF', () => {
    expect(normalizeSource('a\rb\rc')).toBe('a\nb\nc');
  });

  it('trims trailing whitespace and newlines at EOF', () => {
    expect(normalizeSource('hello\n\n  \t\n')).toBe('hello');
  });

  it('preserves interior whitespace, including mid-line hard breaks', () => {
    expect(normalizeSource('line one  \nline two\n')).toBe('line one  \nline two');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeSource('   \r\n\t\n')).toBe('');
  });
});

describe('encodeDoc / decodeDoc', () => {
  it('round-trips text through the compressor', async () => {
    const encoded = await encodeDoc(identityCompressor, 'hello world');
    expect(await decodeDoc(identityCompressor, encoded)).toBe('hello world');
  });

  it('returns null when the compressor cannot decode', async () => {
    expect(await decodeDoc(nullCompressor, 'anything')).toBeNull();
  });

  it('returns null when the compressor rejects', async () => {
    expect(await decodeDoc(rejectingCompressor, 'anything')).toBeNull();
  });

  it('normalizes source before encoding', async () => {
    expect(await encodeDoc(identityCompressor, '﻿hello\r\nworld\n\n')).toBe('hello%0Aworld');
  });
});

describe('buildShareURL', () => {
  it('returns the base URL for empty source', async () => {
    expect(await buildShareURL(loc, '', 'commonmark', identityCompressor)).toBe(
      'https://md.example/render/',
    );
  });

  it('returns the base URL for whitespace-only source', async () => {
    expect(await buildShareURL(loc, '   \n\t', 'commonmark', identityCompressor)).toBe(
      'https://md.example/render/',
    );
  });

  it('returns the base URL for BOM-only source', async () => {
    expect(await buildShareURL(loc, '﻿', 'commonmark', identityCompressor)).toBe(
      'https://md.example/render/',
    );
  });

  it('emits the payload in the URL fragment', async () => {
    expect(await buildShareURL(loc, 'hello', 'commonmark', identityCompressor)).toBe(
      'https://md.example/render/#d=hello',
    );
  });

  it('includes the flavor param when flavor is not commonmark', async () => {
    expect(await buildShareURL(loc, 'hello', 'obsidian', identityCompressor)).toBe(
      'https://md.example/render/#d=hello&f=obsidian',
    );
  });

  it('encodes via the compressor', async () => {
    const url = await buildShareURL(loc, 'a b', 'gfm', identityCompressor);
    expect(url).toBe('https://md.example/render/#d=a%20b&f=gfm');
  });

  it('normalizes the source before encoding', async () => {
    const url = await buildShareURL(loc, 'hi\r\n\n\n', 'commonmark', identityCompressor);
    expect(url).toBe('https://md.example/render/#d=hi');
  });
});

describe('buildShareURL with anchor', () => {
  it('appends the anchor to an empty-source base URL', async () => {
    expect(await buildShareURL(loc, '', 'commonmark', identityCompressor, 'intro')).toBe(
      'https://md.example/render/#intro',
    );
  });

  it('emits the anchor as an `a=` sub-param inside the fragment', async () => {
    expect(await buildShareURL(loc, 'hi', 'gfm', identityCompressor, 'my section')).toBe(
      'https://md.example/render/#d=hi&f=gfm&a=my%20section',
    );
  });

  it('omits the anchor when null', async () => {
    expect(await buildShareURL(loc, 'hi', 'commonmark', identityCompressor, null)).toBe(
      'https://md.example/render/#d=hi',
    );
  });
});

describe('parseShareParams (new hash-based scheme)', () => {
  it('returns all nulls for empty input', async () => {
    expect(await parseShareParams('', identityCompressor)).toEqual({
      source: null,
      flavor: null,
      anchor: null,
    });
  });

  it('decodes the source from the fragment', async () => {
    expect(await parseShareParams('', identityCompressor, '#d=hello%20world')).toEqual({
      source: 'hello world',
      flavor: null,
      anchor: null,
    });
  });

  it('extracts a valid flavor from the fragment', async () => {
    expect(await parseShareParams('', identityCompressor, '#d=x&f=atlassian')).toEqual({
      source: 'x',
      flavor: 'atlassian',
      anchor: null,
    });
  });

  it('rejects an unknown flavor in the fragment', async () => {
    expect(await parseShareParams('', identityCompressor, '#d=x&f=bogus')).toEqual({
      source: 'x',
      flavor: null,
      anchor: null,
    });
  });

  it('returns null source when decode fails', async () => {
    expect(await parseShareParams('', nullCompressor, '#d=garbage')).toEqual({
      source: null,
      flavor: null,
      anchor: null,
    });
  });

  it('returns null source when decode rejects', async () => {
    expect(await parseShareParams('', rejectingCompressor, '#d=garbage')).toEqual({
      source: null,
      flavor: null,
      anchor: null,
    });
  });

  it('accepts a hash without a leading #', async () => {
    expect(await parseShareParams('', identityCompressor, 'd=hi&f=gfm')).toEqual({
      source: 'hi',
      flavor: 'gfm',
      anchor: null,
    });
  });

  it('reads the anchor from the `a=` sub-param', async () => {
    expect(await parseShareParams('', identityCompressor, '#d=x&a=my%20section')).toEqual({
      source: 'x',
      flavor: null,
      anchor: 'my section',
    });
  });

  it('ignores the query string when the fragment has the payload', async () => {
    expect(await parseShareParams('?d=ignored', identityCompressor, '#d=kept')).toEqual({
      source: 'kept',
      flavor: null,
      anchor: null,
    });
  });
});

describe('parseShareParams (legacy query-string scheme)', () => {
  it('decodes the source from the query', async () => {
    expect(await parseShareParams('?d=hello%20world', identityCompressor)).toEqual({
      source: 'hello world',
      flavor: null,
      anchor: null,
    });
  });

  it('extracts a valid flavor from the query', async () => {
    expect(await parseShareParams('?d=x&f=atlassian', identityCompressor)).toEqual({
      source: 'x',
      flavor: 'atlassian',
      anchor: null,
    });
  });

  it('rejects an unknown flavor in the query', async () => {
    expect(await parseShareParams('?d=x&f=bogus', identityCompressor)).toEqual({
      source: 'x',
      flavor: null,
      anchor: null,
    });
  });

  it('returns null source when decode fails', async () => {
    expect(await parseShareParams('?d=garbage', nullCompressor)).toEqual({
      source: null,
      flavor: null,
      anchor: null,
    });
  });

  it('handles search strings without the leading ?', async () => {
    expect(await parseShareParams('d=hi&f=gfm', identityCompressor)).toEqual({
      source: 'hi',
      flavor: 'gfm',
      anchor: null,
    });
  });

  it('parses a percent-encoded hash fragment as an anchor', async () => {
    expect(await parseShareParams('?d=x', identityCompressor, '#my%20section')).toEqual({
      source: 'x',
      flavor: null,
      anchor: 'my section',
    });
  });

  it('accepts a hash anchor without a leading #', async () => {
    expect(await parseShareParams('?d=x', identityCompressor, 'plain-slug')).toEqual({
      source: 'x',
      flavor: null,
      anchor: 'plain-slug',
    });
  });

  it('falls back to the raw fragment when decodeURIComponent fails', async () => {
    expect(await parseShareParams('', identityCompressor, '#%FF')).toEqual({
      source: null,
      flavor: null,
      anchor: '%FF',
    });
  });
});
