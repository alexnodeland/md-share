import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from 'docx';

// 1×1 transparent PNG.
export const TINY_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  ),
  (c) => c.charCodeAt(0),
);

const cell = (text: string) => new TableCell({ children: [new Paragraph(text)] });

/** A small but realistic Word document, built in memory (no binary fixtures in git). */
export const buildSampleDocx = async (): Promise<ArrayBuffer> => {
  const doc = new Document({
    styles: {
      paragraphStyles: [{ id: 'Code', name: 'Code', run: { font: 'Courier New' } }],
    },
    sections: [
      {
        children: [
          new Paragraph({ text: 'Quarterly Plan', heading: HeadingLevel.TITLE }),
          new Paragraph({ text: 'Goals', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [
              new TextRun('Ship '),
              new TextRun({ text: 'fast', bold: true }),
              new TextRun(' and '),
              new TextRun({ text: 'well', italics: true }),
              new TextRun('. See '),
              new ExternalHyperlink({
                link: 'https://example.com/plan',
                children: [new TextRun('the plan')],
              }),
              new TextRun('.'),
            ],
          }),
          new Paragraph({ text: 'First item', bullet: { level: 0 } }),
          new Paragraph({ text: 'Second item', bullet: { level: 0 } }),
          new Paragraph({ text: 'npm run verify', style: 'Code' }),
          new Table({
            rows: [
              new TableRow({ children: [cell('Owner'), cell('Due')], tableHeader: true }),
              new TableRow({ children: [cell('Ada'), cell('Friday')] }),
            ],
          }),
          new Paragraph({
            children: [
              new ImageRun({
                type: 'png',
                data: TINY_PNG,
                transformation: { width: 10, height: 10 },
              }),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
};
