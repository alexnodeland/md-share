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
