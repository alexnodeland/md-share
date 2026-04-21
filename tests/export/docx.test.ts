import { describe, expect, it } from 'vitest';
import { buildDocxBlob } from '../../src/export/docx.ts';

describe('buildDocxBlob', () => {
  it('wraps the input body in a minimal HTML shell before delegating', async () => {
    let captured = '';
    const deps = {
      asBlob: async (html: string) => {
        captured = html;
        return new Blob([html], { type: 'text/html' });
      },
    };
    await buildDocxBlob({ title: 'T', body: '<p>hi</p>', css: 'p{color:red}' }, deps);
    expect(captured).toContain('<!DOCTYPE html>');
    expect(captured).toContain('<title>T</title>');
    expect(captured).toContain('<style>p{color:red}</style>');
    expect(captured).toContain('<article><p>hi</p></article>');
  });

  it('returns the blob produced by the dep', async () => {
    const blob = new Blob(['ok'], { type: 'application/x-test' });
    const out = await buildDocxBlob(
      { title: 't', body: '', css: '' },
      { asBlob: async () => blob },
    );
    expect(out).toBe(blob);
  });

  it('propagates rejection from the blob builder', async () => {
    await expect(
      buildDocxBlob(
        { title: 't', body: '', css: '' },
        {
          asBlob: async () => {
            throw new Error('bad');
          },
        },
      ),
    ).rejects.toThrow('bad');
  });
});
