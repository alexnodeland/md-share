import type { Clipboard } from '../ports.ts';

export const browserClipboard: Clipboard = {
  write: (text) => navigator.clipboard.writeText(text),
};
