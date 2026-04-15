import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { createMermaidCounter, wrapMermaidFences } from '../../src/plugins/mermaid.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  const counter = createMermaidCounter();
  wrapMermaidFences(md, counter);
  return { md, counter };
};

describe('wrapMermaidFences', () => {
  it('wraps mermaid fences in a container with a sequential id', () => {
    const { md } = build();
    const html = md.render('```mermaid\ngraph TD\nA-->B\n```\n\n```mermaid\nC-->D\n```');
    expect(html).toContain('id="mermaid-0"');
    expect(html).toContain('id="mermaid-1"');
    expect(html).toContain('class="mermaid-container"');
  });

  it('escapes HTML in mermaid source', () => {
    const { md } = build();
    const html = md.render('```mermaid\nA[<script>]\n```');
    expect(html).toContain('&lt;script&gt;');
  });

  it('leaves non-mermaid fences alone', () => {
    const { md } = build();
    const html = md.render('```\nplain code\n```');
    expect(html).not.toContain('mermaid-container');
  });

  it('is case-insensitive for the mermaid info string', () => {
    const { md } = build();
    const html = md.render('```MERMAID\ngraph\n```');
    expect(html).toContain('mermaid-container');
  });

  it('counter.reset() restarts numbering', () => {
    const { md, counter } = build();
    md.render('```mermaid\nA\n```');
    counter.reset();
    const html = md.render('```mermaid\nB\n```');
    expect(html).toContain('id="mermaid-0"');
  });
});
