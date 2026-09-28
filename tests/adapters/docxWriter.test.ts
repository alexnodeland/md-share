// @vitest-environment node
import hljs from 'highlight.js';
import JSZip from 'jszip';
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { browserDocxReader } from '../../src/adapters/docxReader.ts';
import { browserDocxWriter } from '../../src/adapters/docxWriter.ts';
import { browserHtmlToMarkdown } from '../../src/adapters/htmlToMarkdown.ts';
import { buildDocModel } from '../../src/docModel.ts';
import { buildMD, createFlavorDeps } from '../../src/flavors.ts';
import type { ExportImage } from '../../src/ports.ts';
import type { Flavor } from '../../src/types.ts';
import { TINY_PNG } from './docxFixture.ts';

const PNG: ExportImage = { data: TINY_PNG, width: 1200, height: 600, type: 'png' };

const exportDocx = async (
  src: string,
  flavor: Flavor = 'gfm',
  resolve: { image?: ExportImage | null; diagram?: ExportImage | null } = {},
) => {
  const model = buildDocModel(buildMD(flavor, createFlavorDeps(hljs, katex)).parse(src, {}));
  const blob = await browserDocxWriter.write(model, {
    title: 'Round trip',
    image: async () => resolve.image ?? null,
    diagram: async () => resolve.diagram ?? null,
  });
  return blob.arrayBuffer();
};

const reimport = async (data: ArrayBuffer) =>
  browserHtmlToMarkdown.convert((await browserDocxReader.toHtml(data, async () => 'data:,x')).html);

const xml = async (data: ArrayBuffer, path: string) =>
  (await JSZip.loadAsync(data)).file(path)?.async('string') ?? '';

describe('browserDocxWriter (adapter, round trip through Word XML)', () => {
  it('keeps headings, emphasis, links, lists, code, and tables through .docx and back', async () => {
    const md = await reimport(
      await exportDocx(
        [
          '# Plan',
          '',
          'Ship **fast**, *well*, ~~late~~ and `npm test`. See [docs](https://x.dev).',
          '',
          '- one',
          '- two',
          '',
          '```sh',
          'npm ci',
          'npm test',
          '```',
          '',
          '| Owner | Due |',
          '|---|---|',
          '| Ada | Fri |',
        ].join('\n'),
      ),
    );
    expect(md).toContain('# Plan');
    expect(md).toContain('**fast**');
    expect(md).toContain('*well*');
    expect(md).toContain('[docs](https://x.dev)');
    expect(md).toMatch(/- one\n- two/);
    expect(md).toContain('```\nnpm ci\nnpm test\n```');
    expect(md).toContain('and `npm test`.');
    expect(md).toContain('| Owner | Due |');
    expect(md).toContain('| Ada | Fri |');
  });

  it('uses real Word structure: heading styles, numbering, footnotes, title', async () => {
    const data = await exportDocx(
      '## Section\n\n1. a\n2. b\n\nClaim[^1].\n\n[^1]: The source.',
      'extended',
    );
    const doc = await xml(data, 'word/document.xml');
    expect(doc).toContain('w:val="Heading2"');
    expect(doc).toContain('<w:numPr>');
    expect(doc).toContain('<w:footnoteReference w:id="1"/>');
    expect(await xml(data, 'word/footnotes.xml')).toContain('The source.');
    expect(await xml(data, 'docProps/core.xml')).toContain('<dc:title>Round trip</dc:title>');
  });

  it('restarts ordered lists and honours their start number', async () => {
    const numbering = await xml(
      await exportDocx('3. c\n4. d\n\npara\n\n1. again'),
      'word/numbering.xml',
    );
    expect(numbering).toContain('<w:start w:val="3"/>');
    expect(numbering).toContain('<w:start w:val="1"/>');
  });

  it('marks task items and shades callouts', async () => {
    const doc = await xml(
      await exportDocx('- [x] done\n- [ ] todo\n\n> [!danger] Careful\n> body', 'obsidian'),
      'word/document.xml',
    );
    expect(doc).toContain('☒ ');
    expect(doc).toContain('☐ ');
    expect(doc).toContain('w:fill="FEF2F2"');
    expect(doc).toContain('w:color="B91C1C"');
  });

  it('embeds resolved images (scaled to page width) and diagrams; falls back otherwise', async () => {
    const src = '![Chart](chart.png)\n\n```mermaid\ngraph TD\nA-->B\n```';
    const withImages = await exportDocx(src, 'gfm', { image: PNG, diagram: PNG });
    const files = Object.keys((await JSZip.loadAsync(withImages)).files);
    expect(files.filter((f) => f.startsWith('word/media/'))).toHaveLength(2);
    expect(await xml(withImages, 'word/document.xml')).toContain('cx="5715000"'); // 600px wide

    const without = await xml(await exportDocx(src), 'word/document.xml');
    expect(without).toContain('[Chart]');
    expect(without).toContain('A--&gt;B');
  });

  it('writes math as TeX in a math font, and rules, quotes, and indented code', async () => {
    const doc = await xml(
      await exportDocx(
        '$$\nE=mc^2\n$$\n\nInline $x$.\n\n---\n\n> quoted\n\n- item\n\n      code',
        'academic',
      ),
      'word/document.xml',
    );
    expect(doc).toContain('E=mc^2');
    expect(doc).toContain('Cambria Math');
    expect(doc).toContain('w:bottom');
    expect(doc).toContain('C4C4CC');
  });

  it('exports every flavor sample', async () => {
    for (const flavor of [
      'commonmark',
      'extended',
      'academic',
      'gfm',
      'obsidian',
      'atlassian',
    ] as const) {
      const { SAMPLES } = await import('../../src/samples.ts');
      const data = await exportDocx(SAMPLES[flavor], flavor);
      expect((await reimport(data)).length).toBeGreaterThan(100);
    }
  });
});
