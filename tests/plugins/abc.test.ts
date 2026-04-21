import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { createAbcCounter, wrapAbcFences } from '../../src/plugins/abc.ts';

const SAMPLE_ABC = 'X:1\nT:Scale\nM:4/4\nL:1/4\nK:C\nC D E F | G A B c |';

const build = () => {
  const md = new MarkdownIt({ html: true });
  const counter = createAbcCounter();
  wrapAbcFences(md, counter);
  return { md, counter };
};

describe('wrapAbcFences', () => {
  it('wraps abc fences in a container with a sequential id', () => {
    const { md } = build();
    const html = md.render(`\`\`\`abc\n${SAMPLE_ABC}\n\`\`\`\n\n\`\`\`abc\n${SAMPLE_ABC}\n\`\`\``);
    expect(html).toContain('id="abc-0"');
    expect(html).toContain('id="abc-1"');
    expect(html).toContain('class="abc-container"');
  });

  it('escapes HTML in the source so angle-bracketed junk cannot inject', () => {
    const { md } = build();
    const html = md.render('```abc\n<script>alert(1)</script>\n```');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('leaves non-abc fences alone', () => {
    const { md } = build();
    const html = md.render('```\nplain code\n```');
    expect(html).not.toContain('abc-container');
  });

  it('is case-insensitive for the abc info string', () => {
    const { md } = build();
    const html = md.render(`\`\`\`ABC\n${SAMPLE_ABC}\n\`\`\``);
    expect(html).toContain('abc-container');
  });

  it('trims whitespace around the info string', () => {
    const { md } = build();
    const html = md.render(`\`\`\`  abc  \n${SAMPLE_ABC}\n\`\`\``);
    expect(html).toContain('abc-container');
  });

  it('counter.reset() restarts numbering', () => {
    const { md, counter } = build();
    md.render(`\`\`\`abc\n${SAMPLE_ABC}\n\`\`\``);
    counter.reset();
    const html = md.render(`\`\`\`abc\n${SAMPLE_ABC}\n\`\`\``);
    expect(html).toContain('id="abc-0"');
  });

  it('counter advances monotonically across separate renders', () => {
    const { md } = build();
    md.render(`\`\`\`abc\n${SAMPLE_ABC}\n\`\`\``);
    const second = md.render(`\`\`\`abc\n${SAMPLE_ABC}\n\`\`\``);
    expect(second).toContain('id="abc-1"');
  });
});
