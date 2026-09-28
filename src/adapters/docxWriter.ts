import type { IParagraphOptions, ParagraphChild } from 'docx';
import { type Block, calloutTone, type Frame, type Inline, type Tone } from '../docModel.ts';
import type { DocxWriter, ExportImage } from '../ports.ts';

type Docx = typeof import('docx');

const MAX_IMAGE_WIDTH = 600;
const INDENT = 720; // twips: half an inch per quote/list level
const CODE_FONT = 'Consolas';
const MATH_FONT = 'Cambria Math';

// The preview's callout palette, light-theme values, as Word colours.
const TONE_COLOURS: Record<Tone, { fill: string; border: string }> = {
  info: { fill: 'EFF6FF', border: '1D4ED8' },
  success: { fill: 'ECFDF3', border: '166534' },
  warning: { fill: 'FFF7ED', border: 'A14A0B' },
  danger: { fill: 'FEF2F2', border: 'B91C1C' },
  neutral: { fill: 'F4F4F5', border: '71717A' },
};

const EXTERNAL_LINK_RE = /^(https?:|mailto:)/i;

const scaled = (img: ExportImage) => {
  const ratio = Math.min(1, MAX_IMAGE_WIDTH / img.width);
  return { width: Math.round(img.width * ratio), height: Math.round(img.height * ratio) };
};

const collectImageSources = (blocks: readonly Block[], into: Set<string>): Set<string> => {
  const fromRuns = (runs: readonly Inline[]) => {
    for (const run of runs) if (run.type === 'image') into.add(run.src);
  };
  for (const block of blocks) {
    if (block.type === 'paragraph' || block.type === 'heading') fromRuns(block.content);
    if (block.type === 'table')
      for (const row of [block.header, ...block.rows]) row.forEach(fromRuns);
  }
  return into;
};

export const browserDocxWriter: DocxWriter = {
  write: async (model, options) => {
    const d: Docx = await import('docx');

    // Resolve every image and diagram up front; rendering is then synchronous.
    const sources = collectImageSources(model.blocks, new Set());
    for (const body of Object.values(model.footnotes)) collectImageSources(body, sources);
    const images = new Map<string, ExportImage | null>();
    await Promise.all([...sources].map(async (src) => images.set(src, await options.image(src))));
    const diagrams = new Map<number, ExportImage | null>();
    for (const block of model.blocks) {
      if (block.type === 'diagram') diagrams.set(block.index, await options.diagram(block.index));
    }

    const imageRun = (img: ExportImage) =>
      new d.ImageRun({ type: img.type, data: img.data, transformation: scaled(img) });

    const runs = (content: readonly Inline[]): ParagraphChild[] => {
      const out: ParagraphChild[] = [];
      let i = 0;
      while (i < content.length) {
        const run = content[i]!;
        const link = run.type === 'text' ? run.marks.link : undefined;
        if (link && EXTERNAL_LINK_RE.test(link)) {
          // Group consecutive runs of the same link into one hyperlink.
          const children: ParagraphChild[] = [];
          while (i < content.length) {
            const next = content[i]!;
            if (next.type !== 'text' || next.marks.link !== link) break;
            children.push(textRun(next, true));
            i++;
          }
          out.push(new d.ExternalHyperlink({ link, children }));
          continue;
        }
        out.push(inlineRun(run));
        i++;
      }
      return out;
    };

    const textRun = (run: Extract<Inline, { type: 'text' }>, hyperlink = false) =>
      new d.TextRun({
        text: run.text,
        bold: run.marks.bold,
        italics: run.marks.italic || run.marks.math,
        strike: run.marks.strike,
        highlight: run.marks.highlight ? 'yellow' : undefined,
        font: run.marks.code ? CODE_FONT : run.marks.math ? MATH_FONT : undefined,
        shading: run.marks.code
          ? { type: d.ShadingType.CLEAR, fill: 'F1F0F5', color: 'auto' }
          : undefined,
        style: hyperlink ? 'Hyperlink' : run.marks.code ? 'VerbatimChar' : undefined,
      });

    const inlineRun = (run: Inline): ParagraphChild => {
      if (run.type === 'text') return textRun(run);
      if (run.type === 'break') return new d.TextRun({ break: 1 });
      if (run.type === 'footnote') return new d.FootnoteReferenceRun(run.id + 1);
      const img = images.get(run.src);
      return img
        ? imageRun(img)
        : new d.TextRun({ text: `[${run.alt || 'image'}]`, italics: true });
    };

    // A callout is one shaded band: no gaps inside it, space around it.
    const framed = (frame: Frame, edges = { first: true, last: true }): IParagraphOptions => {
      const left = INDENT * (frame.quote + frame.indent);
      if (frame.callout) {
        const tone = TONE_COLOURS[calloutTone(frame.callout)];
        return {
          spacing: { before: edges.first ? 120 : 0, after: 0 },
          indent: { left: left + INDENT / 4, right: INDENT / 4 },
          shading: { type: d.ShadingType.CLEAR, fill: tone.fill, color: 'auto' },
          border: { left: { style: d.BorderStyle.SINGLE, size: 18, color: tone.border, space: 6 } },
        };
      }
      if (frame.quote > 0) {
        return {
          indent: { left },
          border: { left: { style: d.BorderStyle.SINGLE, size: 12, color: 'C4C4CC', space: 8 } },
        };
      }
      return left ? { indent: { left } } : {};
    };

    const listStarts = new Map<number, number>();
    const HEADINGS = [
      d.HeadingLevel.HEADING_1,
      d.HeadingLevel.HEADING_2,
      d.HeadingLevel.HEADING_3,
      d.HeadingLevel.HEADING_4,
      d.HeadingLevel.HEADING_5,
      d.HeadingLevel.HEADING_6,
    ];

    // One "Source Code" paragraph per line — Pandoc's convention, which the
    // .docx importer (and Pandoc) read back as a fenced code block.
    const codeParagraphs = (text: string, frame: IParagraphOptions) => {
      const lines = text.split('\n');
      return lines.map(
        (line, n) =>
          new d.Paragraph({
            ...frame,
            style: 'SourceCode',
            shading: frame.shading ?? { type: d.ShadingType.CLEAR, fill: 'F4F4F5', color: 'auto' },
            spacing: { before: n === 0 ? 60 : 0, after: n === lines.length - 1 ? 120 : 0 },
            children: [new d.TextRun(line)],
          }),
      );
    };

    const blockToDocx = (
      block: Block,
      prev?: Block,
      next?: Block,
    ): (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] => {
      const inCallout = (b?: Block) =>
        b && (b.type === 'paragraph' || b.type === 'code') ? b.frame.calloutId : null;
      const id = inCallout(block);
      const edges = { first: inCallout(prev) !== id, last: inCallout(next) !== id };
      switch (block.type) {
        case 'heading':
          return [
            new d.Paragraph({ heading: HEADINGS[block.level - 1], children: runs(block.content) }),
          ];
        case 'paragraph': {
          const { list } = block;
          if (!list)
            return [
              new d.Paragraph({ ...framed(block.frame, edges), children: runs(block.content) }),
            ];
          if (list.ordered && !listStarts.has(list.id)) listStarts.set(list.id, list.start);
          const box = list.checked === null ? [] : [new d.TextRun(list.checked ? '☒ ' : '☐ ')];
          return [
            new d.Paragraph({
              numbering: list.ordered
                ? {
                    reference: `ordered-${listStarts.get(list.id)}`,
                    level: list.level,
                    instance: list.id,
                  }
                : { reference: 'bullets', level: list.level },
              children: [...box, ...runs(block.content)],
            }),
          ];
        }
        case 'code':
          return codeParagraphs(block.text, framed(block.frame, edges));
        case 'math':
          return [
            new d.Paragraph({
              alignment: d.AlignmentType.CENTER,
              children: [new d.TextRun({ text: block.tex, font: MATH_FONT, italics: true })],
            }),
          ];
        case 'diagram': {
          const img = diagrams.get(block.index);
          return img
            ? [new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [imageRun(img)] })]
            : codeParagraphs(block.source.replace(/\n$/, ''), {});
        }
        case 'table': {
          const cell = (content: Inline[], header: boolean) =>
            new d.TableCell({
              shading: header
                ? { type: d.ShadingType.CLEAR, fill: 'EDE9FE', color: 'auto' }
                : undefined,
              children: [
                new d.Paragraph({
                  children: runs(
                    header
                      ? content.map((r) =>
                          r.type === 'text'
                            ? { ...r, marks: { ...r.marks, bold: true as const } }
                            : r,
                        )
                      : content,
                  ),
                }),
              ],
            });
          return [
            new d.Table({
              width: { size: 100, type: d.WidthType.PERCENTAGE },
              rows: [
                new d.TableRow({
                  tableHeader: true,
                  children: block.header.map((c) => cell(c, true)),
                }),
                ...block.rows.map(
                  (row) => new d.TableRow({ children: row.map((c) => cell(c, false)) }),
                ),
              ],
            }),
            new d.Paragraph({}),
          ];
        }
        case 'rule':
          return [
            new d.Paragraph({
              border: {
                bottom: { style: d.BorderStyle.SINGLE, size: 6, color: 'C4C4CC', space: 1 },
              },
            }),
          ];
      }
    };

    // Word joins consecutive paragraphs with identical borders into one box,
    // so an empty paragraph after each callout keeps neighbours apart.
    const calloutEnds = (block: Block, next?: Block) =>
      (block.type === 'paragraph' || block.type === 'code') &&
      block.frame.calloutId !== null &&
      !(
        next &&
        (next.type === 'paragraph' || next.type === 'code') &&
        next.frame.calloutId === block.frame.calloutId
      );
    const render = (blocks: readonly Block[]) =>
      blocks.flatMap((block, i) => [
        ...blockToDocx(block, blocks[i - 1], blocks[i + 1]),
        ...(calloutEnds(block, blocks[i + 1]) ? [new d.Paragraph({ spacing: { after: 0 } })] : []),
      ]);
    const body = render(model.blocks);
    const footnotes: Record<number, { children: InstanceType<Docx['Paragraph']>[] }> = {};
    for (const [id, blocks] of Object.entries(model.footnotes)) {
      footnotes[Number(id) + 1] = {
        children: render(blocks).filter((p) => p instanceof d.Paragraph),
      };
    }

    const bulletGlyphs = ['•', '◦', '▪'];
    const levels = (format: 'bullet' | 'decimal', start: number) =>
      Array.from({ length: 9 }, (_, level) => ({
        level,
        format: format === 'bullet' ? d.LevelFormat.BULLET : d.LevelFormat.DECIMAL,
        text: format === 'bullet' ? (bulletGlyphs[level % 3] as string) : `%${level + 1}.`,
        start,
        alignment: d.AlignmentType.LEFT,
        style: { paragraph: { indent: { left: INDENT * (level + 1), hanging: 360 } } },
      }));
    const starts = new Set([1, ...listStarts.values()]);

    const doc = new d.Document({
      creator: 'md-share',
      title: options.title ?? undefined,
      styles: {
        default: { document: { paragraph: { spacing: { after: 120 } } } },
        paragraphStyles: [
          {
            id: 'SourceCode',
            name: 'Source Code',
            basedOn: 'Normal',
            run: { font: CODE_FONT, size: 19 },
          },
        ],
        characterStyles: [{ id: 'VerbatimChar', name: 'Verbatim Char', run: { font: CODE_FONT } }],
      },
      numbering: {
        config: [
          { reference: 'bullets', levels: levels('bullet', 1) },
          ...[...starts].map((start) => ({
            reference: `ordered-${start}`,
            levels: levels('decimal', start),
          })),
        ],
      },
      footnotes,
      sections: [{ children: body }],
    });
    return d.Packer.toBlob(doc);
  },
};
