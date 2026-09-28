import type { SharedInbox } from '../ports.ts';
import type { SharedPayload } from '../share.ts';

/** Written by sw.js when a share arrives by POST (files included); read once. */
export const SHARED_CACHE = 'md-share-shared';
export const SHARED_KEY = './shared-payload';

export const browserSharedInbox: SharedInbox = {
  take: async () => {
    if (typeof caches === 'undefined') return null;
    try {
      const cache = await caches.open(SHARED_CACHE);
      const response = await cache.match(SHARED_KEY);
      if (!response) return null;
      await cache.delete(SHARED_KEY);
      return (await response.json()) as SharedPayload;
    } catch {
      return null;
    }
  },
};
