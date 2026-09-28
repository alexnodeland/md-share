import { describe, expect, it } from 'vitest';
import { describeDocxImport, fileKind, flavorForDocxImport } from '../src/fileKind.ts';

describe('fileKind', () => {
  it('recognises Word documents by extension or MIME', () => {
    expect(fileKind('Report.DOCX', '')).toBe('docx');
    expect(
      fileKind('blob', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ).toBe('docx');
  });

  it('recognises Markdown and text files', () => {
    expect(fileKind('notes.md', '')).toBe('text');
    expect(fileKind('notes.markdown', '')).toBe('text');
    expect(fileKind('readme', 'text/plain')).toBe('text');
  });

  it('recognises images', () => {
    expect(fileKind('photo.png', 'image/png')).toBe('image');
  });

  it('rejects everything else, including legacy .doc', () => {
    expect(fileKind('old.doc', 'application/msword')).toBe('unsupported');
    expect(fileKind('deck.pdf', 'application/pdf')).toBe('unsupported');
  });
});

describe('describeDocxImport', () => {
  it('names the file and counts images', () => {
    expect(describeDocxImport('a.docx', 0, 0)).toBe('Imported a.docx');
    expect(describeDocxImport('a.docx', 1, 0)).toBe('Imported a.docx — 1 image embedded');
    expect(describeDocxImport('a.docx', 3, 1)).toBe(
      'Imported a.docx — 3 images embedded — 1 image skipped',
    );
    expect(describeDocxImport('a.docx', 0, 2)).toBe('Imported a.docx — 2 images skipped');
  });
});

describe('flavorForDocxImport', () => {
  it('moves CommonMark to GitHub so tables render', () => {
    expect(flavorForDocxImport('commonmark')).toBe('gfm');
  });

  it('keeps every flavor that already renders GFM tables', () => {
    for (const f of ['extended', 'academic', 'gfm', 'obsidian', 'atlassian'] as const) {
      expect(flavorForDocxImport(f)).toBe(f);
    }
  });
});
