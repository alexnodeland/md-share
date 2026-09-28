import { describe, expect, it } from 'vitest';
import type { Compressor } from '../src/ports.ts';
import {
  buildShareURL,
  decodeDoc,
  describeUrlLength,
  embedSnippet,
  encodeDoc,
  hasSharePayload,
  normalizeSource,
  parseShareParams,
  sharedDocument,
  shareTargetDocument,
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
      embed: false,
    });
  });

  it('decodes the source from the fragment', async () => {
    expect(await parseShareParams('', identityCompressor, '#d=hello%20world')).toEqual({
      source: 'hello world',
      flavor: 'commonmark',
      anchor: null,
      embed: false,
    });
  });

  it('extracts a valid flavor from the fragment', async () => {
    expect(await parseShareParams('', identityCompressor, '#d=x&f=atlassian')).toEqual({
      source: 'x',
      flavor: 'atlassian',
      anchor: null,
      embed: false,
    });
  });

  it('rejects an unknown flavor in the fragment', async () => {
    expect(await parseShareParams('', identityCompressor, '#d=x&f=bogus')).toEqual({
      source: 'x',
      flavor: 'commonmark',
      anchor: null,
      embed: false,
    });
  });

  it('returns null source when decode fails', async () => {
    expect(await parseShareParams('', nullCompressor, '#d=garbage')).toEqual({
      source: null,
      flavor: null,
      anchor: null,
      embed: false,
    });
  });

  it('returns null source when decode rejects', async () => {
    expect(await parseShareParams('', rejectingCompressor, '#d=garbage')).toEqual({
      source: null,
      flavor: null,
      anchor: null,
      embed: false,
    });
  });

  it('accepts a hash without a leading #', async () => {
    expect(await parseShareParams('', identityCompressor, 'd=hi&f=gfm')).toEqual({
      source: 'hi',
      flavor: 'gfm',
      anchor: null,
      embed: false,
    });
  });

  it('reads the anchor from the `a=` sub-param', async () => {
    expect(await parseShareParams('', identityCompressor, '#d=x&a=my%20section')).toEqual({
      source: 'x',
      flavor: 'commonmark',
      anchor: 'my section',
      embed: false,
    });
  });

  it('ignores the query string when the fragment has the payload', async () => {
    expect(await parseShareParams('?d=ignored', identityCompressor, '#d=kept')).toEqual({
      source: 'kept',
      flavor: 'commonmark',
      anchor: null,
      embed: false,
    });
  });
});

describe('parseShareParams (legacy query-string scheme)', () => {
  it('decodes the source from the query', async () => {
    expect(await parseShareParams('?d=hello%20world', identityCompressor)).toEqual({
      source: 'hello world',
      flavor: 'commonmark',
      anchor: null,
      embed: false,
    });
  });

  it('extracts a valid flavor from the query', async () => {
    expect(await parseShareParams('?d=x&f=atlassian', identityCompressor)).toEqual({
      source: 'x',
      flavor: 'atlassian',
      anchor: null,
      embed: false,
    });
  });

  it('rejects an unknown flavor in the query', async () => {
    expect(await parseShareParams('?d=x&f=bogus', identityCompressor)).toEqual({
      source: 'x',
      flavor: 'commonmark',
      anchor: null,
      embed: false,
    });
  });

  it('returns null source when decode fails', async () => {
    expect(await parseShareParams('?d=garbage', nullCompressor)).toEqual({
      source: null,
      flavor: null,
      anchor: null,
      embed: false,
    });
  });

  it('handles search strings without the leading ?', async () => {
    expect(await parseShareParams('d=hi&f=gfm', identityCompressor)).toEqual({
      source: 'hi',
      flavor: 'gfm',
      anchor: null,
      embed: false,
    });
  });

  it('parses a percent-encoded hash fragment as an anchor', async () => {
    expect(await parseShareParams('?d=x', identityCompressor, '#my%20section')).toEqual({
      source: 'x',
      flavor: 'commonmark',
      anchor: 'my section',
      embed: false,
    });
  });

  it('accepts a hash anchor without a leading #', async () => {
    expect(await parseShareParams('?d=x', identityCompressor, 'plain-slug')).toEqual({
      source: 'x',
      flavor: 'commonmark',
      anchor: 'plain-slug',
      embed: false,
    });
  });

  it('falls back to the raw fragment when decodeURIComponent fails', async () => {
    expect(await parseShareParams('', identityCompressor, '#%FF')).toEqual({
      source: null,
      flavor: null,
      anchor: '%FF',
      embed: false,
    });
  });
});

describe('hasSharePayload', () => {
  it('detects a payload in the fragment, with or without the leading #', () => {
    expect(hasSharePayload('#d=abc&f=gfm')).toBe(true);
    expect(hasSharePayload('d=abc')).toBe(true);
  });

  it('detects a legacy payload in the query string', () => {
    expect(hasSharePayload('', '?d=abc')).toBe(true);
  });

  it('ignores plain heading anchors and empty input', () => {
    expect(hasSharePayload('#my-section')).toBe(false);
    expect(hasSharePayload('')).toBe(false);
    expect(hasSharePayload('#a=intro', '?f=gfm')).toBe(false);
  });
});

describe('share round trip', () => {
  it('pins CommonMark even though the URL omits `f=`', async () => {
    const loc = { origin: 'https://md.example', pathname: '/' };
    const url = new URL(
      await buildShareURL(loc, '==not a highlight==', 'commonmark', identityCompressor),
    );
    expect(url.hash).not.toContain('f=');
    const parsed = await parseShareParams(url.search, identityCompressor, url.hash);
    expect(parsed.flavor).toBe('commonmark');
  });
});

describe('describeUrlLength', () => {
  it('says a short link fits anywhere', () => {
    expect(describeUrlLength(1234)).toEqual({
      level: 'ok',
      text: 'Link: 1,234 chars — fits anywhere, even a QR code',
    });
    expect(describeUrlLength(2000).level).toBe('ok');
  });

  it('names which apps take a longer link and which do not', () => {
    expect(describeUrlLength(2001)).toEqual({
      level: 'soft',
      text: 'Link: 2,001 chars — fits Slack and WhatsApp; too long for a QR code or Discord',
    });
    expect(describeUrlLength(40_001).text).toBe(
      'Link: 40,001 chars — fits WhatsApp; too long for a QR code, Discord or Slack',
    );
    expect(describeUrlLength(65_536).level).toBe('soft');
  });

  it('suggests sending the file past what chat apps take', () => {
    const { level, text } = describeUrlLength(90_000);
    expect(level).toBe('over');
    expect(text).toBe(
      'Link: 90,000 chars — opens in browsers, but too long to paste into most chat apps. Use Send file… instead.',
    );
  });
});

describe('embed mode', () => {
  const loc = { origin: 'https://md.example', pathname: '/' };

  it('round-trips the e=1 flag through the fragment', async () => {
    const url = new URL(await buildShareURL(loc, '# Hi', 'gfm', identityCompressor, null, true));
    expect(url.hash).toContain('&e=1');
    expect((await parseShareParams(url.search, identityCompressor, url.hash)).embed).toBe(true);
  });

  it('is off unless the fragment says e=1', async () => {
    expect((await parseShareParams('', identityCompressor, '#d=x&e=0')).embed).toBe(false);
    expect((await parseShareParams('?d=x&e=1', identityCompressor)).embed).toBe(false);
  });

  it('builds an escaped, lazy, titled iframe snippet', () => {
    expect(embedSnippet('https://md.example/#d=a&e=1', 'Q&A "notes"')).toBe(
      '<iframe src="https://md.example/#d=a&amp;e=1" title="Q&amp;A &quot;notes&quot;" width="100%" height="600" style="border:0" loading="lazy"></iframe>',
    );
    expect(embedSnippet('u', null)).toContain('title="Document"');
  });
});

describe('shareTargetDocument', () => {
  it('builds a document from shared title, text, and url', () => {
    expect(shareTargetDocument('?title=Trip&text=Pack%20light&url=https%3A%2F%2Fx.dev')).toBe(
      '# Trip\n\nPack light\n\nhttps://x.dev',
    );
  });

  it('does not repeat a url that is already in the text', () => {
    expect(shareTargetDocument('?text=Read%20https%3A%2F%2Fx.dev&url=https%3A%2F%2Fx.dev')).toBe(
      'Read https://x.dev',
    );
  });

  it('is null when nothing was shared', () => {
    expect(shareTargetDocument('')).toBeNull();
    expect(shareTargetDocument('?title=%20%20')).toBeNull();
    expect(shareTargetDocument('?d=abc&f=gfm')).toBeNull();
  });
});

describe('sharedDocument', () => {
  const payload = { title: 'T', text: 'Body', url: 'https://x.dev', files: [] };

  it('prefers shared Markdown or text files, joining several with rules', () => {
    expect(
      sharedDocument({
        ...payload,
        files: [
          { name: 'a.md', type: 'text/markdown', text: '# A' },
          { name: 'photo.jpg', type: 'image/jpeg', text: '' },
          { name: 'b.txt', type: 'text/plain', text: 'B' },
        ],
      }),
    ).toBe('# A\n\n---\n\nB');
  });

  it('falls back to the title, text, and link when no file is readable', () => {
    expect(
      sharedDocument({ ...payload, files: [{ name: 'x.png', type: 'image/png', text: '' }] }),
    ).toBe('# T\n\nBody\n\nhttps://x.dev');
    expect(sharedDocument({ title: ' ', text: '', url: '', files: [] })).toBeNull();
  });
});
