import { describe, expect, it } from 'vitest';
import { fileLinkLabel, isDirty } from '../src/fileLink.ts';

describe('fileLink', () => {
  const link = { name: 'notes.md', saved: '# Notes' };

  it('is dirty only when the text differs from what was saved', () => {
    expect(isDirty(link, '# Notes')).toBe(false);
    expect(isDirty(link, '# Notes!')).toBe(true);
  });

  it('labels a saved file by name', () => {
    expect(fileLinkLabel(link, '# Notes', 'Ctrl+S')).toEqual({
      text: 'notes.md',
      title: 'Saved to notes.md',
    });
  });

  it('marks unsaved edits and names the shortcut', () => {
    expect(fileLinkLabel(link, '# Changed', '⌘S')).toEqual({
      text: 'notes.md •',
      title: 'Unsaved changes — save to notes.md (⌘S)',
    });
  });
});
