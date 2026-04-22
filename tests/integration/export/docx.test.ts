// Integration: drive src/adapters/docxBuild.ts end-to-end with real
// html-docx-js-typescript.
//
// Unit tests in tests/export/docx.test.ts stub `asBlob`, so the library is
// never called. Here we verify that the adapter produces a real Blob whose
// bytes begin with the ZIP magic number and carry the right MIME type —
// the invariants downstream consumers (Word, LibreOffice) depend on.

import { describe, expect, it } from 'vitest';
import { buildBrowserDocx } from '../../../src/adapters/docxBuild.ts';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"

const sample = {
  title: 'Smoke test doc',
  body: '<h1>Heading</h1><p>Body with <strong>bold</strong>.</p><ul><li>One</li><li>Two</li></ul>',
  css: 'body { font-family: sans-serif; }',
};

describe('integration: DOCX export via real html-docx-js-typescript', () => {
  it('returns a non-empty Blob', async () => {
    const blob = await buildBrowserDocx(sample);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('produces bytes that open as a ZIP (DOCX container)', async () => {
    const blob = await buildBrowserDocx(sample);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(4);
    expect(Array.from(bytes.slice(0, 4))).toEqual(ZIP_MAGIC);
  });

  it('carries the DOCX MIME type on the coerced Blob', async () => {
    const blob = await buildBrowserDocx(sample);
    // html-docx-js-typescript's Node path returns a Buffer; the adapter
    // coerces to Blob with the canonical DOCX MIME. Either way the Blob's
    // `.type` should be the OOXML word-processing type.
    expect(blob.type).toBe(DOCX_MIME);
  });
});
