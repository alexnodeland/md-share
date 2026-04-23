// Integration: drive src/adapters/docxToMd.ts end-to-end with real Mammoth
// feeding real Turndown.
//
// Uses tests/fixtures/sample.docx (see tests/fixtures/README.md). A behavioral
// change in Mammoth or Turndown will fail these tests — unit tests at
// tests/importers/docx.test.ts mock both libraries so can't catch that.

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createBrowserDocxToMd } from '../../../src/adapters/docxToMd.ts';
import { browserHtmlToMd } from '../../../src/adapters/htmlToMd.ts';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, '../../fixtures/sample.docx');

// Node's fs returns a Buffer backed by a pooled ArrayBuffer; hand mammoth a
// clean slice so it sees only this file's bytes.
const readDocxAsArrayBuffer = async (path: string): Promise<ArrayBuffer> => {
  const buf = await readFile(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

describe('integration: DOCX → Markdown via real Mammoth + real Turndown', () => {
  const docx = createBrowserDocxToMd(browserHtmlToMd);

  it('extracts the heading from the fixture', async () => {
    const bytes = await readDocxAsArrayBuffer(FIXTURE);
    const md = await docx.convert(bytes);
    expect(md).toContain('# Heading');
  });

  it('extracts bold inline runs from the paragraph', async () => {
    const bytes = await readDocxAsArrayBuffer(FIXTURE);
    const md = await docx.convert(bytes);
    expect(md).toContain('**bold**');
  });

  it('converts the bullet list to markdown list items', async () => {
    const bytes = await readDocxAsArrayBuffer(FIXTURE);
    const md = await docx.convert(bytes);
    // Turndown pads bullet markers; match structurally.
    expect(md).toMatch(/^-\s+First$/m);
    expect(md).toMatch(/^-\s+Second$/m);
    expect(md).toMatch(/^-\s+Third$/m);
  });

  it('preserves table cell text (round-trips shape is lossy but content survives)', async () => {
    const bytes = await readDocxAsArrayBuffer(FIXTURE);
    const md = await docx.convert(bytes);
    for (const cell of ['A', 'B', '1', '2', '3', '4']) {
      expect(md).toContain(cell);
    }
  });

  it('rejects an empty ArrayBuffer with a descriptive error', async () => {
    await expect(docx.convert(new ArrayBuffer(0))).rejects.toThrow();
  });
});
