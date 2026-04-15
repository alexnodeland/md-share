import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { applyHighlighting } from '../../src/plugins/highlighting.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  applyHighlighting(md, hljs);
  return md;
};

describe('applyHighlighting', () => {
  it('highlights code with a known language', () => {
    const html = build().render('```js\nconst x = 1;\n```');
    expect(html).toContain('hljs-keyword');
  });

  it('skips mermaid fences (returns raw string)', () => {
    const md = build();
    const result = md.options.highlight?.('graph TD\nA-->B', 'mermaid', '');
    expect(result).toBe('graph TD\nA-->B');
  });

  it('falls back to auto-detect for unknown languages', () => {
    const md = build();
    const result = md.options.highlight?.('function f() { return 1 }', 'bogusLang', '');
    expect(typeof result).toBe('string');
  });

  it('returns empty string when auto-detect throws', () => {
    const md = new MarkdownIt();
    applyHighlighting(md, {
      ...hljs,
      getLanguage: () => undefined,
      highlightAuto: () => {
        throw new Error('boom');
      },
    } as unknown as typeof hljs);
    expect(md.options.highlight?.('x', '', '')).toBe('');
  });

  it('falls through auto-detect when language highlight throws', () => {
    const md = new MarkdownIt();
    applyHighlighting(md, {
      ...hljs,
      getLanguage: () => ({}) as unknown as ReturnType<typeof hljs.getLanguage>,
      highlight: () => {
        throw new Error('boom');
      },
    } as unknown as typeof hljs);
    expect(typeof md.options.highlight?.('x', 'js', '')).toBe('string');
  });
});
