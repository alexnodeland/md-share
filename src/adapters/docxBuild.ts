// Materialize the pure IR from `src/export/docx.ts` into a real DOCX blob
// via the `docx` npm package.
//
// `docx` is lazy-loaded (like every heavy adapter in this project) so users
// who never hit the DOCX export path don't pay its cost on first paint.

import type MarkdownIt from 'markdown-it';
import { buildDocxOps, type DocxOp, type InlineRun } from '../export/docx.ts';

type DocxLib = typeof import('docx');

let mod: DocxLib | null = null;
let pending: Promise<DocxLib> | null = null;

const loadLib = (): Promise<DocxLib> => {
  if (mod) return Promise.resolve(mod);
  if (!pending) {
    pending = import('docx').then((m) => {
      mod = m;
      return mod;
    });
  }
  return pending;
};

export interface BuildDocxInput {
  source: string;
  title: string;
  md: MarkdownIt;
}

const HEADING_CONSTANT = [
  'HEADING_1',
  'HEADING_2',
  'HEADING_3',
  'HEADING_4',
  'HEADING_5',
  'HEADING_6',
] as const;

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const ORDERED_REF = 'md-share-ordered';

// Convert an inline run to a docx TextRun — wrapped in ExternalHyperlink
// when the run carries an href.
const toRun = (
  lib: DocxLib,
  run: InlineRun,
): InstanceType<DocxLib['TextRun']> | InstanceType<DocxLib['ExternalHyperlink']> => {
  const opts: Record<string, unknown> = { text: run.text };
  if (run.bold) opts.bold = true;
  if (run.italic) opts.italics = true;
  if (run.strike) opts.strike = true;
  if (run.code) {
    opts.font = 'Consolas';
    opts.highlight = 'lightGray';
  }
  const textRun = new lib.TextRun(opts as ConstructorParameters<DocxLib['TextRun']>[0]);
  if (run.href) {
    return new lib.ExternalHyperlink({
      link: run.href,
      children: [textRun],
    });
  }
  return textRun;
};

// docx's Paragraph constructor accepts either a plain string or an options
// object; narrow to the options overload via the static type of a dummy lib.
type ParagraphOptions = Exclude<ConstructorParameters<DocxLib['Paragraph']>[0], string>;
type ParagraphChildren = NonNullable<ParagraphOptions['children']>;

const runsToChildren = (lib: DocxLib, runs: InlineRun[]): ParagraphChildren =>
  runs.map((r) => toRun(lib, r)) as unknown as ParagraphChildren;

const opToBlocks = (
  lib: DocxLib,
  op: DocxOp,
): Array<InstanceType<DocxLib['Paragraph']> | InstanceType<DocxLib['Table']>> => {
  switch (op.kind) {
    case 'heading': {
      const heading = (lib.HeadingLevel as unknown as Record<string, string>)[
        HEADING_CONSTANT[op.level - 1]!
      ];
      return [
        new lib.Paragraph({
          heading: heading as never,
          children: runsToChildren(lib, op.runs),
        }),
      ];
    }
    case 'paragraph':
      return [
        new lib.Paragraph({
          children: runsToChildren(lib, op.runs),
        }),
      ];
    case 'list-item':
      return [
        new lib.Paragraph({
          ...(op.ordered
            ? { numbering: { reference: ORDERED_REF, level: op.level } }
            : { bullet: { level: op.level } }),
          children: runsToChildren(lib, op.runs),
        }),
      ];
    case 'blockquote':
      return [
        new lib.Paragraph({
          indent: { left: 360 },
          border: {
            left: { color: '999999', space: 8, style: 'single', size: 12 },
          },
          children: runsToChildren(lib, op.runs),
        }),
      ];
    case 'code-block':
      return op.content.split('\n').map(
        (line) =>
          new lib.Paragraph({
            children: [new lib.TextRun({ text: line, font: 'Consolas' })],
          }),
      );
    case 'hr':
      return [
        new lib.Paragraph({
          border: {
            bottom: { color: '999999', space: 1, style: 'single', size: 6 },
          },
          children: [],
        }),
      ];
    case 'table': {
      const cellOf = (runs: InlineRun[]) =>
        new lib.TableCell({
          children: [
            new lib.Paragraph({
              children: runsToChildren(lib, runs.length ? runs : [{ text: '' }]),
            }),
          ],
        });
      const rows: Array<InstanceType<DocxLib['TableRow']>> = [];
      if (op.headers.length) {
        rows.push(new lib.TableRow({ tableHeader: true, children: op.headers.map(cellOf) }));
      }
      for (const row of op.rows) {
        rows.push(new lib.TableRow({ children: row.map(cellOf) }));
      }
      return [
        new lib.Table({
          width: { size: 100, type: lib.WidthType.PERCENTAGE },
          rows,
        }),
      ];
    }
  }
};

// `docx` needs a numbering declaration to render ordered lists. Configure one
// reference that every ordered list in the document shares; nesting levels
// reuse the reference with a different `level`.
const buildNumbering = (lib: DocxLib) => ({
  config: [
    {
      reference: ORDERED_REF,
      levels: Array.from({ length: 9 }, (_, i) => ({
        level: i,
        format: (lib.LevelFormat as unknown as Record<string, string>).DECIMAL,
        text: `%${i + 1}.`,
        alignment: (lib.AlignmentType as unknown as Record<string, string>).START,
      })),
    },
  ],
});

export const buildBrowserDocx = async ({ source, md }: BuildDocxInput): Promise<Blob> => {
  const lib = await loadLib();
  const ops = buildDocxOps(source, md);
  const children = ops.flatMap((op) => opToBlocks(lib, op));
  const doc = new lib.Document({
    numbering: buildNumbering(lib) as never,
    sections: [{ properties: {}, children }],
  });
  const blob = await lib.Packer.toBlob(doc);
  // In Node (tests), Packer.toBlob returns a Buffer-ish object. Wrap to a
  // real Blob with the canonical DOCX MIME type so the download path and
  // consumers that sniff on `.type` always see the right shape.
  if (blob instanceof Blob && blob.type === DOCX_MIME) return blob;
  const ab: ArrayBuffer =
    blob instanceof Blob
      ? await blob.arrayBuffer()
      : ((blob as unknown as { buffer?: ArrayBuffer }).buffer ?? (blob as unknown as ArrayBuffer));
  return new Blob([ab], { type: DOCX_MIME });
};
