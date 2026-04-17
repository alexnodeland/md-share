import type { Clipboard } from '../ports.ts';

export const browserClipboard: Clipboard = {
  write: (text) => {
    if (!navigator.clipboard?.writeText) {
      return Promise.reject(new Error('Clipboard API unavailable'));
    }
    return navigator.clipboard.writeText(text);
  },
};
