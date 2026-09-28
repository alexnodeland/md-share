import hljs from 'highlight.js';
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { buildMD, createFlavorDeps } from '../src/flavors.ts';
import { describeDiagnostics, lintDocument } from '../src/lint.ts';
import { SAMPLES } from '../src/samples.ts';
import { FLAVOR_NAMES, type Flavor, type RenderEnv } from '../src/types.ts';

const lint = (body: string, flavor: Flavor = 'extended', lineOffset = 0) => {
  const env: RenderEnv = {};
  const tokens = buildMD(flavor, createFlavorDeps(hljs, katex)).parse(body, env);
  return lintDocument(tokens, {
    body,
    lineOffset,
    headings: env.headings ?? [],
    footnotes: flavor === 'extended' || flavor === 'academic' || flavor === 'obsidian',
  });
};

describe('lintDocument', () => {
  it('passes a clean document', () => {
    expect(
      lint('# A\n\n## B\n\n[to B](#b) ![alt](x.png)\n\nSee[^1].\n\n[^1]: ok\n\n[back](#fn1)'),
    ).toEqual([]);
  });

  it('flags heading level skips, but not going back up', () => {
    expect(lint('# A\n\n### C\n\n## B\n\n# D')).toEqual([
      {
        rule: 'heading-skip',
        line: 3,
        message: 'Heading jumps from h1 to h3 — screen-reader outlines expect h2',
      },
    ]);
  });

  it('flags empty headings', () => {
    expect(lint('# A\n\n##')).toEqual([
      { rule: 'heading-empty', line: 3, message: 'Heading is empty' },
    ]);
  });

  it('flags images without alt text', () => {
    expect(lint('text\n\n![](x.png) ![ok](y.png)').map((d) => [d.rule, d.line])).toEqual([
      ['image-alt', 3],
    ]);
  });

  it('flags empty links and anchors that match no heading', () => {
    expect(
      lint(
        '# Real\n\n[](https://x.dev) [x]() [ok](#real) [bad](#nope) [top](#) [ext](https://x.dev#y)',
      ),
    ).toEqual([
      { rule: 'link-empty', line: 3, message: 'Link has no text' },
      { rule: 'link-empty', line: 3, message: 'Link has no destination' },
      { rule: 'link-anchor', line: 3, message: 'Link to #nope matches no heading' },
    ]);
  });

  it('decodes percent-encoded anchors before matching', () => {
    expect(lint('# Café\n\n[go](#caf%C3%A9)')).toEqual([]);
  });

  it('flags undefined footnotes only in flavors that parse footnotes', () => {
    expect(lint('Claim[^src] and[^1].\n\n[^1]: fine')).toEqual([
      { rule: 'footnote-undefined', line: 1, message: 'Footnote [^src] has no definition' },
    ]);
    expect(lint('Claim[^src].', 'gfm')).toEqual([]);
  });

  it('flags an unclosed code fence and accepts closed ones', () => {
    expect(
      lint('```js\nconst a = 1;\n```\n\n~~~~\nok\n~~~~\n\n```\nnever closed\n\n# Lost'),
    ).toEqual([
      {
        rule: 'fence-unclosed',
        line: 9,
        message: 'Code fence is never closed — the rest of the document is code',
      },
    ]);
    expect(lint('```')).toHaveLength(1);
    expect(lint('{code}\nx\n{code}', 'atlassian')).toEqual([]);
  });

  it('reports editor lines, counting stripped frontmatter', () => {
    expect(lint('![](x.png)', 'gfm', 3)[0]?.line).toBe(4);
  });

  it('sorts diagnostics by line', () => {
    expect(lint('# A\n\n#### D\n\n![](x.png)\n\n### C\n\n[x](#no)').map((d) => d.line)).toEqual([
      3, 5, 9,
    ]);
  });

  it.each(FLAVOR_NAMES)('finds nothing to fix in the %s sample', (flavor) => {
    expect(lint(SAMPLES[flavor], flavor)).toEqual([]);
  });
});

describe('describeDiagnostics', () => {
  it('counts issues', () => {
    expect(describeDiagnostics(1)).toBe('1 issue');
    expect(describeDiagnostics(3)).toBe('3 issues');
  });
});
