// Integration: drive the DOCX exporter end-to-end with the real `docx`
// library, then round-trip the bytes back through Mammoth. Mammoth only
// finds text inside real OOXML paragraphs (`<w:p>` / `<w:r>` / `<w:t>`) —
// our previous exporter wrapped HTML in `<w:altChunk>`, which rendered as
// blank in LibreOffice / Pages / Google Docs. The round-trip here is the
// "is the DOCX actually readable" check.

import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { buildBrowserDocx } from '../../../src/adapters/docxBuild.ts';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

const md = () => new MarkdownIt({ html: true, linkify: true });

const roundTripToText = async (blob: Blob): Promise<string> => {
  const bytes = await blob.arrayBuffer();
  const mammoth = (await import('mammoth/mammoth.browser.min.js')) as unknown as {
    default?: typeof import('mammoth');
  } & typeof import('mammoth');
  const lib = mammoth.default ?? mammoth;
  const result = await lib.extractRawText({ arrayBuffer: bytes });
  return result.value;
};

describe('integration: Markdown → DOCX via real `docx` library', () => {
  it('emits a ZIP blob with the right MIME', async () => {
    const blob = await buildBrowserDocx({ title: 't', source: '# Hi', md: md() });
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe(DOCX_MIME);
    const head = new Uint8Array((await blob.arrayBuffer()).slice(0, 4));
    expect(Array.from(head)).toEqual(ZIP_MAGIC);
  });

  it('round-trips a heading through Mammoth', async () => {
    const blob = await buildBrowserDocx({
      title: 't',
      source: '# Chapter 1\n\nSome prose.',
      md: md(),
    });
    const text = await roundTripToText(blob);
    expect(text).toContain('Chapter 1');
    expect(text).toContain('Some prose.');
  });

  it('round-trips a bullet list', async () => {
    const blob = await buildBrowserDocx({
      title: 't',
      source: '- one\n- two\n- three',
      md: md(),
    });
    const text = await roundTripToText(blob);
    for (const item of ['one', 'two', 'three']) expect(text).toContain(item);
  });

  it('round-trips table cell text', async () => {
    const src = ['| A | B |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |'].join('\n');
    const blob = await buildBrowserDocx({ title: 't', source: src, md: md() });
    const text = await roundTripToText(blob);
    for (const cell of ['A', 'B', '1', '2', '3', '4']) expect(text).toContain(cell);
  });

  it('round-trips bold / italic as plain text (decorations survive as formatting)', async () => {
    // extractRawText only returns raw text — but that's enough to prove the
    // content isn't sitting in an inaccessible altChunk.
    const blob = await buildBrowserDocx({
      title: 't',
      source: 'It is **bold** and *italic*.',
      md: md(),
    });
    const text = await roundTripToText(blob);
    expect(text).toContain('bold');
    expect(text).toContain('italic');
  });

  it('survives an empty source cleanly', async () => {
    const blob = await buildBrowserDocx({ title: 't', source: '', md: md() });
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe(DOCX_MIME);
  });
});
