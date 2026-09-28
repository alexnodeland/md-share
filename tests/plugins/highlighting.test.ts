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

  it('defers mermaid fences to markdown-it escaping (returns empty)', () => {
    const md = build();
    const result = md.options.highlight?.('graph TD\nA-->B', 'mermaid', '');
    expect(result).toBe('');
  });

  it('never emits raw HTML from a mermaid-tagged fence', () => {
    const html = build().render('```mermaid x\n<img src=x onerror=alert(1)>\n```');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('leaves unlabelled fences plain (escaped by markdown-it)', () => {
    const html = build().render('```\n<b>x</b>\n```');
    expect(html).toContain('<pre><code>&lt;b&gt;x&lt;/b&gt;\n</code></pre>');
  });

  it('reports unloaded languages and renders them plain meanwhile', () => {
    const seen: string[] = [];
    const md = new MarkdownIt();
    applyHighlighting(md, hljs, (lang) => seen.push(lang));
    expect(md.options.highlight?.('x', 'bogusLang', '')).toBe('');
    expect(seen).toEqual(['bogusLang']);
  });

  it('returns empty (plain) when the grammar throws', () => {
    const md = new MarkdownIt();
    applyHighlighting(md, {
      ...hljs,
      getLanguage: () => ({}) as unknown as ReturnType<typeof hljs.getLanguage>,
      highlight: () => {
        throw new Error('boom');
      },
    } as unknown as typeof hljs);
    expect(md.options.highlight?.('x', 'js', '')).toBe('');
  });
});
