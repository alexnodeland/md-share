import type { Storage } from './ports.ts';

const DRAFT_KEY = 'md-share:draft';

export const saveDraft = (storage: Storage, source: string): void => {
  storage.set(DRAFT_KEY, source);
};

export const loadDraft = (storage: Storage): string | null => storage.get(DRAFT_KEY);

export const clearDraft = (storage: Storage): void => {
  storage.set(DRAFT_KEY, '');
};
