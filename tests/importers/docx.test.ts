import { describe, expect, it } from 'vitest';
import { docxToMarkdown } from '../../src/importers/docx.ts';

describe('docxToMarkdown', () => {
  it('pipes mammoth html output through the html converter', async () => {
    const bytes = new ArrayBuffer(8);
    const out = await docxToMarkdown(bytes, {
      mammothConvert: async () => ({ html: '<p>hi</p>', warnings: [] }),
      htmlToMarkdown: async (html) => `md:${html}`,
    });
    expect(out).toBe('md:<p>hi</p>');
  });

  it('propagates mammoth rejections', async () => {
    await expect(
      docxToMarkdown(new ArrayBuffer(0), {
        mammothConvert: async () => {
          throw new Error('bad docx');
        },
        htmlToMarkdown: async () => '',
      }),
    ).rejects.toThrow('bad docx');
  });

  it('passes mammoth warnings through without blocking conversion', async () => {
    const out = await docxToMarkdown(new ArrayBuffer(0), {
      mammothConvert: async () => ({ html: '<h1>X</h1>', warnings: ['unsupported style'] }),
      htmlToMarkdown: async (html) => html,
    });
    expect(out).toBe('<h1>X</h1>');
  });
});
