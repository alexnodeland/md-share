// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { browserDocxReader } from '../../src/adapters/docxReader.ts';
import { browserHtmlToMarkdown } from '../../src/adapters/htmlToMarkdown.ts';
import { buildSampleDocx } from './docxFixture.ts';

const importDocx = async (embed: (b: Uint8Array, t: string) => Promise<string | null>) => {
  const result = await browserDocxReader.toHtml(await buildSampleDocx(), embed);
  return { ...result, markdown: await browserHtmlToMarkdown.convert(result.html) };
};

describe('browserDocxReader (adapter, real .docx)', () => {
  it('turns Word structure into Markdown', async () => {
    const { markdown } = await importDocx(async () => null);
    expect(markdown).toContain('# Quarterly Plan');
    expect(markdown).toContain('# Goals');
    expect(markdown).toContain(
      'Ship **fast** and *well*. See [the plan](https://example.com/plan).',
    );
    expect(markdown).toContain('- First item\n- Second item');
    expect(markdown).toContain('```\nnpm run verify\n```');
    expect(markdown).toContain('| Owner | Due |\n| --- | --- |\n| Ada | Friday |');
  });

  it('embeds images through the provided callback and counts them', async () => {
    const seen: string[] = [];
    const { markdown, images, skippedImages } = await importDocx(async (bytes, type) => {
      seen.push(`${type}:${bytes.length}`);
      return 'data:image/png;base64,AAAA';
    });
    expect(seen).toEqual([expect.stringMatching(/^image\/png:\d+$/)]);
    expect(images).toBe(1);
    expect(skippedImages).toBe(0);
    expect(markdown).toContain('![](data:image/png;base64,AAAA)');
  });

  it('drops images the callback refuses or fails on, without broken markup', async () => {
    const refused = await importDocx(async () => null);
    expect(refused.skippedImages).toBe(1);
    expect(refused.markdown).not.toContain('![');
    const failed = await importDocx(async () => {
      throw new Error('decode failed');
    });
    expect(failed.skippedImages).toBe(1);
    expect(failed.markdown).not.toContain('![');
  });
});
