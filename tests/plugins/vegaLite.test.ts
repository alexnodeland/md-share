import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { createVegaLiteCounter, wrapVegaLiteFences } from '../../src/plugins/vegaLite.ts';

const SAMPLE_SPEC = '{"mark":"bar"}';

const build = () => {
  const md = new MarkdownIt({ html: true });
  const counter = createVegaLiteCounter();
  wrapVegaLiteFences(md, counter);
  return { md, counter };
};

describe('wrapVegaLiteFences', () => {
  it('wraps vega-lite fences in a container with a sequential id', () => {
    const { md } = build();
    const html = md.render(
      `\`\`\`vega-lite\n${SAMPLE_SPEC}\n\`\`\`\n\n\`\`\`vega-lite\n${SAMPLE_SPEC}\n\`\`\``,
    );
    expect(html).toContain('id="vega-lite-0"');
    expect(html).toContain('id="vega-lite-1"');
    expect(html).toContain('class="vega-lite-container"');
  });

  it('escapes HTML in the spec so angle-bracketed junk cannot inject', () => {
    const { md } = build();
    const html = md.render('```vega-lite\n{"title":"<script>"}\n```');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('leaves non-vega-lite fences alone', () => {
    const { md } = build();
    const html = md.render('```\nplain code\n```');
    expect(html).not.toContain('vega-lite-container');
  });

  it('is case-insensitive for the vega-lite info string', () => {
    const { md } = build();
    const html = md.render(`\`\`\`VEGA-LITE\n${SAMPLE_SPEC}\n\`\`\``);
    expect(html).toContain('vega-lite-container');
  });

  it('trims whitespace around the info string', () => {
    const { md } = build();
    const html = md.render(`\`\`\`  vega-lite  \n${SAMPLE_SPEC}\n\`\`\``);
    expect(html).toContain('vega-lite-container');
  });

  it('counter.reset() restarts numbering', () => {
    const { md, counter } = build();
    md.render(`\`\`\`vega-lite\n${SAMPLE_SPEC}\n\`\`\``);
    counter.reset();
    const html = md.render(`\`\`\`vega-lite\n${SAMPLE_SPEC}\n\`\`\``);
    expect(html).toContain('id="vega-lite-0"');
  });

  it('counter advances monotonically across separate renders', () => {
    const { md } = build();
    md.render(`\`\`\`vega-lite\n${SAMPLE_SPEC}\n\`\`\``);
    const second = md.render(`\`\`\`vega-lite\n${SAMPLE_SPEC}\n\`\`\``);
    expect(second).toContain('id="vega-lite-1"');
  });
});
