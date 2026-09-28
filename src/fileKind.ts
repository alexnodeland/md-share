import type { FilePickerType } from './ports.ts';

import type { Flavor } from './types.ts';

export type FileKind = 'text' | 'docx' | 'image' | 'unsupported';

const TEXT_EXT = /\.(md|markdown|mdown|mkd|txt)$/i;
const DOCX_EXT = /\.docx$/i;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** What an opened or dropped file should become. The extension wins over MIME, which browsers often leave blank. */
export const fileKind = (name: string, mime: string): FileKind => {
  if (DOCX_EXT.test(name) || mime === DOCX_MIME) return 'docx';
  if (TEXT_EXT.test(name) || mime.startsWith('text/')) return 'text';
  if (mime.startsWith('image/')) return 'image';
  return 'unsupported';
};

/** Accept list for the Open… picker. */
export const OPENABLE_TYPES = '.md,.markdown,.mdown,.mkd,.txt,.docx,text/*';

/** The same set, grouped for the File System Access picker. */
export const PICKER_TYPES: FilePickerType[] = [
  {
    description: 'Markdown or text',
    accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'], 'text/plain': ['.txt'] },
  },
  {
    description: 'Word document',
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  },
  { description: 'Image', accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] } },
];

export const MARKDOWN_PICKER_TYPES = PICKER_TYPES.slice(0, 1);

/** Toast after a Word import: what came in and what was dropped. */
export const describeDocxImport = (name: string, images: number, skipped: number): string => {
  const parts = [`Imported ${name}`];
  if (images > 0) parts.push(images === 1 ? '1 image embedded' : `${images} images embedded`);
  if (skipped > 0) parts.push(skipped === 1 ? '1 image skipped' : `${skipped} images skipped`);
  return parts.join(' — ');
};

/**
 * Word imports arrive as GFM (tables, `~~strike~~`). Every flavor but
 * CommonMark renders that, so only CommonMark switches — to GitHub.
 */
export const flavorForDocxImport = (current: Flavor): Flavor =>
  current === 'commonmark' ? 'gfm' : current;
