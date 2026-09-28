import hljs from 'highlight.js';
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { buildDocModel, calloutTone, type DocModel } from '../src/docModel.ts';
import { buildMD, createFlavorDeps } from '../src/flavors.ts';
import { SAMPLES } from '../src/samples.ts';
import { FLAVOR_NAMES, type Flavor } from '../src/types.ts';

const model = (src: string, flavor: Flavor = 'gfm'): DocModel =>
  buildDocModel(buildMD(flavor, createFlavorDeps(hljs, katex)).parse(src, {}));

const top = { quote: 0, callout: null, calloutId: null, indent: 0 };

describe('buildDocModel — blocks', () => {
  it('builds headings and paragraphs', () => {
    expect(model('## Title\n\nHello').blocks).toEqual([
      { type: 'heading', level: 2, content: [{ type: 'text', text: 'Title', marks: {} }] },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello', marks: {} }],
        list: null,
        frame: top,
      },
    ]);
  });

  it('numbers ordered lists from their start, restarting per list, with nesting levels', () => {
    const { blocks } = model('3. a\n4. b\n   - nested\n\ntext\n\n1. again');
    const lists = blocks.flatMap((b) => (b.type === 'paragraph' && b.list ? [b.list] : []));
    expect(lists).toEqual([
      { id: 0, ordered: true, level: 0, start: 3, checked: null },
      { id: 0, ordered: true, level: 0, start: 4, checked: null },
      { id: 1, ordered: false, level: 1, start: 1, checked: null },
      { id: 2, ordered: true, level: 0, start: 1, checked: null },
    ]);
  });

  it('records task state and indents continuation paragraphs', () => {
    const { blocks } = model('- [x] done\n\n  more about it\n- [ ] todo');
    expect(
      blocks.map((b) =>
        b.type === 'paragraph' ? [b.list?.checked ?? null, b.frame.indent] : null,
      ),
    ).toEqual([
      [true, 1],
      [null, 1],
      [false, 1],
    ]);
  });

  it('ignores empty list items', () => {
    expect(model('-\n- b').blocks).toHaveLength(1);
  });

  it('tracks quote depth', () => {
    const { blocks } = model('> a\n>> b');
    expect(blocks.map((b) => (b.type === 'paragraph' ? b.frame.quote : -1))).toEqual([1, 2]);
  });

  it('turns Obsidian callouts into a titled, toned frame (nested quotes too)', () => {
    const { blocks } = model('> [!warning] Careful\n> body\n>> inner', 'obsidian');
    expect(blocks[0]).toMatchObject({
      content: [{ text: 'Careful', marks: { bold: true } }],
      frame: { callout: 'warning' },
    });
    expect(blocks[1]).toMatchObject({ frame: { callout: 'warning', quote: 0 } });
    expect(blocks[2]).toMatchObject({ frame: { callout: 'warning', quote: 1 } });
  });

  it('turns Atlassian panels and expands into titled frames', () => {
    const { blocks } = model(
      '{info:title=Heads up}\nx\n{info}\n\n{note}\ny\n{note}\n\n{expand}\nz\n{expand}\n\n{expand:More}\nw\n{expand}',
      'atlassian',
    );
    const titles = blocks.filter((_, i) => i % 2 === 0);
    expect(
      titles.map((b) => (b.type === 'paragraph' ? [b.frame.callout, b.content[0]] : null)),
    ).toEqual([
      ['info', { type: 'text', text: 'Heads up', marks: { bold: true } }],
      ['note', { type: 'text', text: 'Note', marks: { bold: true } }],
      ['expand', { type: 'text', text: 'Click to expand', marks: { bold: true } }],
      ['expand', { type: 'text', text: 'More', marks: { bold: true } }],
    ]);
    expect(blocks.at(-1)).toMatchObject({ frame: { callout: 'expand', calloutId: 3 } });
    expect(blocks[0]).toMatchObject({ frame: { calloutId: 0 } });
    const after = model('{info}\nx\n{info}\n\nout', 'atlassian').blocks.at(-1);
    expect(after).toMatchObject({ frame: { callout: null } });
  });

  it('separates code, indented code, diagrams, math, and rules', () => {
    const { blocks } = model(
      '```ts\nconst a = 1;\n```\n\n    indented\n\n```mermaid\ngraph TD\n```\n\n```mermaid\nA-->B\n```\n\n$$\nx^2\n$$\n\n---',
      'academic',
    );
    expect(blocks).toEqual([
      { type: 'code', text: 'const a = 1;', language: 'ts', frame: top },
      { type: 'code', text: 'indented', language: '', frame: top },
      { type: 'diagram', source: 'graph TD\n', index: 0 },
      { type: 'diagram', source: 'A-->B\n', index: 1 },
      { type: 'math', tex: 'x^2' },
      { type: 'rule' },
    ]);
  });

  it('keeps the text of raw HTML blocks and drops empty ones', () => {
    const { blocks } = model('<div>\n<b>Kept</b>\n</div>\n\n<br>');
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Kept', marks: {} }],
        list: null,
        frame: top,
      },
    ]);
  });

  it('builds tables with a header row', () => {
    const { blocks } = model('| A | **B** |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |');
    expect(blocks).toEqual([
      {
        type: 'table',
        header: [
          [{ type: 'text', text: 'A', marks: {} }],
          [{ type: 'text', text: 'B', marks: { bold: true } }],
        ],
        rows: [
          [[{ type: 'text', text: '1', marks: {} }], [{ type: 'text', text: '2', marks: {} }]],
          [[{ type: 'text', text: '3', marks: {} }], [{ type: 'text', text: '4', marks: {} }]],
        ],
      },
    ]);
  });

  it('collects footnote bodies separately from the flow', () => {
    const { blocks, footnotes } = model('See[^n].\n\n[^n]: The *note*.', 'extended');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      content: [{ text: 'See' }, { type: 'footnote', id: 0 }, { text: '.' }],
    });
    expect(footnotes[0]).toEqual([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'The ', marks: {} },
          { type: 'text', text: 'note', marks: { italic: true } },
          { type: 'text', text: '.', marks: {} },
        ],
        list: null,
        frame: top,
      },
    ]);
  });

  it('bolds definition terms and indents their definitions', () => {
    const { blocks } = model('Term\n: Meaning', 'extended');
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Term', marks: { bold: true } }],
        list: null,
        frame: top,
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Meaning', marks: {} }],
        list: null,
        frame: { ...top, indent: 1 },
      },
    ]);
  });

  it.each(FLAVOR_NAMES)('models every %s sample without throwing', (flavor) => {
    expect(model(SAMPLES[flavor], flavor).blocks.length).toBeGreaterThan(5);
  });
});

describe('buildDocModel — inline runs', () => {
  const runs = (src: string, flavor: Flavor = 'gfm') => {
    const [first] = model(src, flavor).blocks;
    return first?.type === 'paragraph' ? first.content : [];
  };

  it('stacks and releases emphasis, strike, and code marks', () => {
    expect(runs('**b *bi*** ~~s~~ `c`')).toEqual([
      { type: 'text', text: 'b ', marks: { bold: true } },
      { type: 'text', text: 'bi', marks: { bold: true, italic: true } },
      { type: 'text', text: ' ', marks: {} },
      { type: 'text', text: 's', marks: { strike: true } },
      { type: 'text', text: ' ', marks: {} },
      { type: 'text', text: 'c', marks: { code: true } },
    ]);
  });

  it('carries link targets on the runs inside the link', () => {
    expect(runs('[**go** there](https://x.dev) after')).toEqual([
      { type: 'text', text: 'go', marks: { bold: true, link: 'https://x.dev' } },
      { type: 'text', text: ' there', marks: { link: 'https://x.dev' } },
      { type: 'text', text: ' after', marks: {} },
    ]);
  });

  it('models images, line breaks, and soft breaks', () => {
    expect(runs('a  \nb\nc ![Alt text](pic.png)')).toEqual([
      { type: 'text', text: 'a', marks: {} },
      { type: 'break' },
      { type: 'text', text: 'b', marks: {} },
      { type: 'text', text: ' ', marks: {} },
      { type: 'text', text: 'c ', marks: {} },
      { type: 'image', src: 'pic.png', alt: 'Alt text' },
    ]);
  });

  it('models inline math and Obsidian highlights, tags, and wikilinks', () => {
    expect(runs('$x$ ==hot== #tag [[Page|shown]]', 'obsidian')).toEqual([
      { type: 'text', text: 'x', marks: { math: true } },
      { type: 'text', text: ' ', marks: {} },
      { type: 'text', text: 'hot', marks: { highlight: true } },
      { type: 'text', text: ' ', marks: {} },
      { type: 'text', text: '#tag', marks: {} },
      { type: 'text', text: ' ', marks: {} },
      { type: 'text', text: 'shown', marks: {} },
    ]);
  });

  it('models Atlassian mentions and status badges', () => {
    expect(runs('@ada {status:color=Green|title=DONE}', 'atlassian')).toEqual([
      { type: 'text', text: '@ada', marks: {} },
      { type: 'text', text: ' ', marks: {} },
      { type: 'text', text: 'DONE', marks: { bold: true } },
    ]);
  });

  it('drops raw inline HTML tags but keeps their text', () => {
    expect(runs('a <b>bold</b> c')).toEqual([
      { type: 'text', text: 'a ', marks: {} },
      { type: 'text', text: 'bold', marks: {} },
      { type: 'text', text: ' c', marks: {} },
    ]);
  });
});

describe('calloutTone', () => {
  it('groups callout and panel types into the preview colour families', () => {
    expect(calloutTone('note')).toBe('info');
    expect(calloutTone('tip')).toBe('success');
    expect(calloutTone('faq')).toBe('warning');
    expect(calloutTone('error')).toBe('danger');
    expect(calloutTone('expand')).toBe('neutral');
    expect(calloutTone('quote')).toBe('neutral');
  });
});
