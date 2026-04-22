// One-shot generator for tests/fixtures/sample.docx.
//
// Run: `node tests/fixtures/generate-sample-docx.mjs`
//
// Uses the `docx` library (dev-dep) to author a Word-compatible DOCX with
// proper OOXML (paragraphs, runs, tables) — Mammoth can parse this shape.
// html-docx-js-typescript was tried first but emits <w:altChunk> wrappers
// that Mammoth ignores by design.
//
// Fixture contents:
//   - <h1> "Heading"
//   - paragraph with bold + italic inline runs
//   - three-item bullet list
//   - 2x2 table with header row
//
// Commit the .docx; keep this script for regeneration.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const cell = (text) =>
  new TableCell({
    children: [new Paragraph(text)],
    width: { size: 50, type: WidthType.PERCENTAGE },
  });

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun('Heading')],
        }),
        new Paragraph({
          children: [
            new TextRun('A paragraph with '),
            new TextRun({ text: 'bold', bold: true }),
            new TextRun(' and '),
            new TextRun({ text: 'italic', italics: true }),
            new TextRun(' text.'),
          ],
        }),
        new Paragraph({
          text: 'First',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Second',
          bullet: { level: 0 },
        }),
        new Paragraph({
          text: 'Third',
          bullet: { level: 0 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [cell('A'), cell('B')],
            }),
            new TableRow({ children: [cell('1'), cell('2')] }),
            new TableRow({ children: [cell('3'), cell('4')] }),
          ],
          alignment: AlignmentType.LEFT,
        }),
      ],
    },
  ],
});

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'sample.docx');

const buf = await Packer.toBuffer(doc);
writeFileSync(out, buf);
console.log(`Wrote ${out} (${buf.length} bytes)`);
