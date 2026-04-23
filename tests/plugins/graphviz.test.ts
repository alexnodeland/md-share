import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { createGraphvizCounter, wrapGraphvizFences } from '../../src/plugins/graphviz.ts';

const SAMPLE_DOT = 'digraph G { A -> B; B -> C; }';

const build = () => {
  const md = new MarkdownIt({ html: true });
  const counter = createGraphvizCounter();
  wrapGraphvizFences(md, counter);
  return { md, counter };
};

describe('wrapGraphvizFences', () => {
  it('wraps graphviz fences in a container with a sequential id', () => {
    const { md } = build();
    const html = md.render(
      `\`\`\`graphviz\n${SAMPLE_DOT}\n\`\`\`\n\n\`\`\`graphviz\n${SAMPLE_DOT}\n\`\`\``,
    );
    expect(html).toContain('id="graphviz-0"');
    expect(html).toContain('id="graphviz-1"');
    expect(html).toContain('class="graphviz-container"');
  });

  it('also matches the `dot` fence info', () => {
    const { md } = build();
    const html = md.render(`\`\`\`dot\n${SAMPLE_DOT}\n\`\`\``);
    expect(html).toContain('graphviz-container');
    expect(html).toContain('id="graphviz-0"');
  });

  it('numbers graphviz and dot fences in the same sequence', () => {
    const { md } = build();
    const html = md.render(
      `\`\`\`graphviz\n${SAMPLE_DOT}\n\`\`\`\n\n\`\`\`dot\n${SAMPLE_DOT}\n\`\`\``,
    );
    expect(html).toContain('id="graphviz-0"');
    expect(html).toContain('id="graphviz-1"');
  });

  it('escapes HTML in the source so angle-bracketed junk cannot inject', () => {
    const { md } = build();
    const html = md.render('```graphviz\n<script>alert(1)</script>\n```');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('leaves non-graphviz fences alone', () => {
    const { md } = build();
    const html = md.render('```\nplain code\n```');
    expect(html).not.toContain('graphviz-container');
  });

  it('is case-insensitive for both fence infos', () => {
    const { md } = build();
    const html1 = md.render(`\`\`\`GRAPHVIZ\n${SAMPLE_DOT}\n\`\`\``);
    expect(html1).toContain('graphviz-container');
    const html2 = md.render(`\`\`\`DOT\n${SAMPLE_DOT}\n\`\`\``);
    expect(html2).toContain('graphviz-container');
  });

  it('trims whitespace around the info string', () => {
    const { md } = build();
    const html = md.render(`\`\`\`  graphviz  \n${SAMPLE_DOT}\n\`\`\``);
    expect(html).toContain('graphviz-container');
  });

  it('counter.reset() restarts numbering', () => {
    const { md, counter } = build();
    md.render(`\`\`\`graphviz\n${SAMPLE_DOT}\n\`\`\``);
    counter.reset();
    const html = md.render(`\`\`\`graphviz\n${SAMPLE_DOT}\n\`\`\``);
    expect(html).toContain('id="graphviz-0"');
  });

  it('counter advances monotonically across separate renders', () => {
    const { md } = build();
    md.render(`\`\`\`graphviz\n${SAMPLE_DOT}\n\`\`\``);
    const second = md.render(`\`\`\`dot\n${SAMPLE_DOT}\n\`\`\``);
    expect(second).toContain('id="graphviz-1"');
  });
});
