import hljs from 'highlight.js';
import { describe, expect, it } from 'vitest';
import {
  appendTrailingSentinel,
  highlightMarkdownSource,
  needsTrailingNewline,
} from '../src/editorHighlight.ts';

describe('needsTrailingNewline', () => {
  it('is true for the empty string', () => {
    expect(needsTrailingNewline('')).toBe(true);
  });

  it('is true when the source ends with a newline', () => {
    expect(needsTrailingNewline('hello\n')).toBe(true);
  });

  it('is false for a source not ending in a newline', () => {
    expect(needsTrailingNewline('hello')).toBe(false);
  });
});

describe('appendTrailingSentinel', () => {
  it('appends a sentinel when source needs a trailing newline', () => {
    expect(appendTrailingSentinel('<span>x</span>', 'x\n')).toBe('<span>x</span>\n ');
  });

  it('leaves html untouched when source does not need a sentinel', () => {
    expect(appendTrailingSentinel('<span>x</span>', 'x')).toBe('<span>x</span>');
  });
});

describe('highlightMarkdownSource', () => {
  it('wraps markdown syntax in hljs spans', () => {
    const out = highlightMarkdownSource('# heading\n', hljs);
    expect(out).toContain('hljs-section');
  });

  it('highlights emphasis', () => {
    const out = highlightMarkdownSource('*italic*', hljs);
    expect(out).toContain('hljs-emphasis');
  });

  it('appends the trailing sentinel when source ends with newline', () => {
    const out = highlightMarkdownSource('text\n', hljs);
    expect(out.endsWith('\n ')).toBe(true);
  });

  it('does not append a sentinel when source has no trailing newline', () => {
    const out = highlightMarkdownSource('text', hljs);
    expect(out.endsWith('\n ')).toBe(false);
  });

  it('returns the trailing sentinel only for the empty string', () => {
    expect(highlightMarkdownSource('', hljs)).toBe('\n ');
  });

  it('highlights fenced code with its declared language', () => {
    const out = highlightMarkdownSource('```js\nconst x = 1;\n```\n', hljs);
    expect(out).toContain('hljs-keyword');
    expect(out).toContain('<span class="hljs-code">```js</span>');
    expect(out).toContain('<span class="hljs-code">```</span>');
  });

  it('escapes inner code when the declared language is unknown', () => {
    const out = highlightMarkdownSource('```bogus-lang\n<a>\n```\n', hljs);
    expect(out).toContain('&lt;a&gt;');
    expect(out).not.toContain('hljs-keyword');
  });

  it('escapes inner code when no language is declared', () => {
    const out = highlightMarkdownSource('```\n<a>\n```\n', hljs);
    expect(out).toContain('&lt;a&gt;');
  });

  it('renders an empty fence without an inner chunk', () => {
    const out = highlightMarkdownSource('```js\n```\n', hljs);
    expect(out).toContain('<span class="hljs-code">```js</span>');
    expect(out).toContain('<span class="hljs-code">```</span>');
  });

  it('leaves an unterminated fence without a closer', () => {
    const out = highlightMarkdownSource('```js\nconst x = 1;', hljs);
    expect(out).toContain('<span class="hljs-code">```js</span>');
    expect(out).toContain('hljs-keyword');
    expect((out.match(/class="hljs-code"/g) ?? []).length).toBe(1);
  });

  it('handles a document that starts with a fence (no leading prose)', () => {
    const out = highlightMarkdownSource('```js\nx\n```\n', hljs);
    expect(out.startsWith('<span class="hljs-code">```js</span>')).toBe(true);
  });

  it('handles multiple fences separated by prose', () => {
    const src = '# h\n\n```js\n1\n```\n\nbetween\n\n```py\n2\n```\n';
    const out = highlightMarkdownSource(src, hljs);
    expect((out.match(/class="hljs-code"/g) ?? []).length).toBe(4);
    expect(out).toContain('hljs-section');
  });

  it('treats a longer closer as valid when it has at least the opener length', () => {
    const out = highlightMarkdownSource('````js\ninside\n````\n', hljs);
    expect(out).toContain('<span class="hljs-code">````js</span>');
  });

  it('falls back to escaped source when the highlighter throws', () => {
    const broken = {
      highlight: () => {
        throw new Error('boom');
      },
      getLanguage: () => undefined,
    } as unknown as typeof hljs;
    const out = highlightMarkdownSource('<a>&"\'', broken);
    expect(out).toBe('&lt;a&gt;&amp;&quot;&#39;');
  });

  it('falls back when the highlighter throws for a known language fence', () => {
    const brokenKnown = {
      highlight: () => {
        throw new Error('boom');
      },
      getLanguage: () => ({}) as unknown as ReturnType<typeof hljs.getLanguage>,
    } as unknown as typeof hljs;
    const out = highlightMarkdownSource('```js\n<a>\n```\n', brokenKnown);
    expect(out).toContain('&lt;a&gt;');
  });
});
