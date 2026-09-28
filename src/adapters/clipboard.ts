import type { Clipboard } from '../ports.ts';

const writeText = (text: string): Promise<void> => {
  if (!navigator.clipboard?.writeText) {
    return Promise.reject(new Error('Clipboard API unavailable'));
  }
  return navigator.clipboard.writeText(text);
};

export const browserClipboard: Clipboard = {
  write: writeText,
  writeRich: (html, text) => {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      return writeText(text);
    }
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    });
    return navigator.clipboard.write([item]);
  },
};
