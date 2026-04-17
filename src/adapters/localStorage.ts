import type { Storage } from '../ports.ts';

export const browserStorage: Storage = {
  get: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* quota or disabled — ignore */
    }
  },
};
