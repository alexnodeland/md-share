import { describe, expect, it } from 'vitest';
import { type Diagnostic, lint } from '../src/lint.ts';

const render = (html: string): Element => {
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  return doc.getElementById('root')!;
};

const run = (
  source: string,
  html = '',
  flavor: 'commonmark' | 'obsidian' = 'commonmark',
): Diagnostic[] => lint({ source, preview: render(html), flavor });

describe('lint — images without alt', () => {
  it('warns when an img has no alt attribute', () => {
    const out = run('', '<img src="x.png">');
    expect(out.find((d) => d.id === 'img-alt-missing')).toBeDefined();
  });

  it('warns when alt is an empty string', () => {
    const out = run('', '<img src="x.png" alt="">');
    expect(out.find((d) => d.id === 'img-alt-missing')).toBeDefined();
  });

  it('does not warn when alt is present and non-empty', () => {
    const out = run('', '<img src="x.png" alt="icon">');
    expect(out.find((d) => d.id === 'img-alt-missing')).toBeUndefined();
  });

  it('counts multiple images in the aggregate fallback message', () => {
    const out = run('', '<img src="a.png"><img src="b.png">');
    const diag = out.find((d) => d.id === 'img-alt-missing')!;
    expect(diag.message).toContain('2 images');
  });

  it('uses singular form for exactly one image', () => {
    const out = run('', '<img src="a.png">');
    const diag = out.find((d) => d.id === 'img-alt-missing')!;
    expect(diag.message).toContain('1 image without');
  });

  it('emits per-image diagnostics with sourceRange for `![](src)` in source', () => {
    const source = 'Intro\n\n![](no-alt.png)\n';
    const out = run(source, '<img src="no-alt.png">');
    const diags = out.filter((d) => d.id === 'img-alt-missing');
    expect(diags.length).toBe(1);
    expect(diags[0]!.message).toBe('Image without alt text');
    const range = diags[0]!.sourceRange!;
    expect(source.slice(range.start, range.end)).toBe('![](no-alt.png)');
  });

  it('does not flag `![alt](src)` with non-empty alt', () => {
    const out = run('![dog](x.png)', '<img src="x.png" alt="dog">');
    expect(out.find((d) => d.id === 'img-alt-missing')).toBeUndefined();
  });

  it('ignores `![]()` shorthand sitting inside a fence', () => {
    const out = run('```\n![](x.png)\n```', '');
    expect(out.find((d) => d.id === 'img-alt-missing')).toBeUndefined();
  });

  it('emits per-image for multiple `![]()` with distinct ranges', () => {
    const source = '![](a.png) and ![](b.png)';
    const out = run(source, '<img src="a.png"><img src="b.png">');
    const diags = out.filter((d) => d.id === 'img-alt-missing' && d.sourceRange);
    expect(diags.length).toBe(2);
    expect(source.slice(diags[0]!.sourceRange!.start, diags[0]!.sourceRange!.end)).toBe(
      '![](a.png)',
    );
    expect(source.slice(diags[1]!.sourceRange!.start, diags[1]!.sourceRange!.end)).toBe(
      '![](b.png)',
    );
  });
});

describe('lint — tables without header', () => {
  it('warns when a table has no <th>', () => {
    const out = run('', '<table><tbody><tr><td>a</td></tr></tbody></table>');
    expect(out.find((d) => d.id === 'table-no-header')).toBeDefined();
  });

  it('does not warn when <th> is present', () => {
    const out = run('', '<table><thead><tr><th>a</th></tr></thead></table>');
    expect(out.find((d) => d.id === 'table-no-header')).toBeUndefined();
  });

  it('pluralizes tables correctly', () => {
    const out = run('', '<table><tr><td>a</td></tr></table><table><tr><td>b</td></tr></table>');
    const diag = out.find((d) => d.id === 'table-no-header')!;
    expect(diag.message).toContain('2 tables');
  });

  it('uses singular for a single offending table', () => {
    const out = run('', '<table><tr><td>a</td></tr></table>');
    const diag = out.find((d) => d.id === 'table-no-header')!;
    expect(diag.message).toContain('1 table without');
  });
});

describe('lint — duplicate slugs', () => {
  it('warns for each duplicated heading id', () => {
    const out = run('', '<h2 id="x">A</h2><h3 id="x">B</h3>');
    const dupes = out.filter((d) => d.id === 'heading-slug-dup');
    expect(dupes.length).toBe(1);
    expect(dupes[0]!.targetId).toBe('x');
  });

  it('does not warn when ids are unique', () => {
    const out = run('', '<h2 id="a">A</h2><h3 id="b">B</h3>');
    expect(out.find((d) => d.id === 'heading-slug-dup')).toBeUndefined();
  });

  it('ignores headings without an id', () => {
    const out = run('', '<h2>A</h2><h2>A</h2>');
    expect(out.find((d) => d.id === 'heading-slug-dup')).toBeUndefined();
  });
});

describe('lint — unbalanced block math', () => {
  it('warns on a single unmatched $$', () => {
    const out = run('$$\nE = mc^2');
    expect(out.find((d) => d.id === 'math-block-unbalanced')).toBeDefined();
  });

  it('does not warn for a balanced $$ … $$ pair', () => {
    const out = run('$$\nE = mc^2\n$$');
    expect(out.find((d) => d.id === 'math-block-unbalanced')).toBeUndefined();
  });

  it('does not warn when $$ occurs inside a code fence', () => {
    const out = run('```\n$$\n```');
    expect(out.find((d) => d.id === 'math-block-unbalanced')).toBeUndefined();
  });

  it('counts two $$ on the same line as a balanced pair', () => {
    const out = run('inline $$x$$ end');
    expect(out.find((d) => d.id === 'math-block-unbalanced')).toBeUndefined();
  });
});

describe('lint — missing footnote defs', () => {
  it('warns when a [^ref] has no matching [^ref]: definition', () => {
    const out = run('See [^a] for details.');
    const diag = out.find((d) => d.id === 'footnote-def-missing');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('[^a]');
  });

  it('does not warn when the definition is present', () => {
    const out = run('See [^a].\n\n[^a]: a note');
    expect(out.find((d) => d.id === 'footnote-def-missing')).toBeUndefined();
  });

  it('ignores refs inside fenced code blocks', () => {
    const out = run('```\n[^ghost]\n```');
    expect(out.find((d) => d.id === 'footnote-def-missing')).toBeUndefined();
  });

  it('treats multiple missing refs as separate diagnostics', () => {
    const out = run('[^a] and [^b]');
    const missing = out.filter((d) => d.id === 'footnote-def-missing');
    expect(missing.length).toBe(2);
  });
});

describe('lint — broken heading refs', () => {
  it('warns when a [text](#slug) points at a non-existent heading', () => {
    const source = '[jump](#missing)';
    const out = run(source, '<h2 id="present">x</h2>');
    const diag = out.find((d) => d.id === 'heading-ref-broken');
    expect(diag).toBeDefined();
    expect(diag!.sourceRange).toEqual({ start: 0, end: source.length });
    // sourceRange replaces the old targetId-to-missing-slug pattern.
    expect(diag!.targetId).toBeUndefined();
  });

  it('does not warn when the slug exists', () => {
    const out = run('[jump](#present)', '<h2 id="present">x</h2>');
    expect(out.find((d) => d.id === 'heading-ref-broken')).toBeUndefined();
  });

  it('emits one diagnostic per broken ref occurrence', () => {
    const source = '[a](#x) and [b](#x)';
    const out = run(source, '<h2 id="y">y</h2>');
    const diags = out.filter((d) => d.id === 'heading-ref-broken');
    expect(diags.length).toBe(2);
    expect(source.slice(diags[0]!.sourceRange!.start, diags[0]!.sourceRange!.end)).toBe('[a](#x)');
    expect(source.slice(diags[1]!.sourceRange!.start, diags[1]!.sourceRange!.end)).toBe('[b](#x)');
  });

  it('ignores links inside code fences', () => {
    const out = run('```\n[x](#missing)\n```', '<h2 id="y">y</h2>');
    expect(out.find((d) => d.id === 'heading-ref-broken')).toBeUndefined();
  });
});

describe('lint — low contrast', () => {
  it('warns when a styled element pairs low-contrast color + background', () => {
    const out = run('', '<p style="color:#777;background:#fff">hi</p>');
    const diag = out.find((d) => d.id === 'contrast-low');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('4.4');
    expect(diag!.message).toContain('#777');
    expect(diag!.message).toContain('#fff');
  });

  it('does not warn when contrast meets AA (e.g. black on white)', () => {
    const out = run('', '<p style="color:#000;background:#fff">hi</p>');
    expect(out.find((d) => d.id === 'contrast-low')).toBeUndefined();
  });

  it('honors background-color alongside background shorthand', () => {
    const out = run('', '<p style="color:#888;background-color:#ffffff">hi</p>');
    expect(out.find((d) => d.id === 'contrast-low')).toBeDefined();
  });

  it('extracts a color from a shorthand background with extras', () => {
    // Atlassian-panel-esque shorthand: color plus extra tokens.
    const out = run('', '<div style="color:#888;background:#ffffff no-repeat">x</div>');
    expect(out.find((d) => d.id === 'contrast-low')).toBeDefined();
  });

  it('extracts an rgb() from a shorthand background', () => {
    const out = run('', '<div style="color:rgb(120,120,120);background:rgb(255,255,255)">x</div>');
    expect(out.find((d) => d.id === 'contrast-low')).toBeDefined();
  });

  it('skips elements where the color is unparseable', () => {
    const out = run('', '<p style="color:chartreuse;background:#fff">hi</p>');
    expect(out.find((d) => d.id === 'contrast-low')).toBeUndefined();
  });

  it('skips elements where the background is unparseable', () => {
    const out = run('', '<p style="color:#000;background:url(foo.png)">hi</p>');
    expect(out.find((d) => d.id === 'contrast-low')).toBeUndefined();
  });

  it('skips elements missing one of color / background', () => {
    const out = run('', '<p style="color:#000">hi</p><p style="background:#fff">hi</p>');
    expect(out.find((d) => d.id === 'contrast-low')).toBeUndefined();
  });

  it('ignores Mermaid/SVG internals (fill=, descendants of <svg>)', () => {
    const out = run('', '<svg><text fill="#777" style="color:#777;background:#fff">x</text></svg>');
    expect(out.find((d) => d.id === 'contrast-low')).toBeUndefined();
  });

  it('ignores style declarations without a colon', () => {
    const out = run('', '<p style="color:#888;background:#fff;garbage">hi</p>');
    // Still fires for the low-contrast pair; the "garbage" decl is dropped without error.
    expect(out.find((d) => d.id === 'contrast-low')).toBeDefined();
  });

  it('tolerates empty-prop and empty-value declarations without crashing', () => {
    // Declarations like ":orphan" and "prop:" are skipped by the style parser;
    // the low-contrast pair still fires.
    const out = run('', '<p style=":orphan;emptyval:;color:#888;background:#fff">hi</p>');
    expect(out.find((d) => d.id === 'contrast-low')).toBeDefined();
  });
});

describe('lint — clean input', () => {
  it('returns empty array when nothing is wrong', () => {
    const out = run(
      'Hello world.\n\n[link](#y)\n\n[^n]: note',
      '<h2 id="y">y</h2><img src="a.png" alt="a"><table><thead><tr><th>a</th></tr></thead></table>',
    );
    expect(out).toEqual([]);
  });
});
