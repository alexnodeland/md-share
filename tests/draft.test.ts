import { describe, expect, it } from 'vitest';
import { clearDraft, loadDraft, saveDraft } from '../src/draft.ts';
import type { Storage } from '../src/ports.ts';

const makeStorage = (initial: Record<string, string> = {}): Storage => {
  const store = new Map(Object.entries(initial));
  return {
    get: (k) => store.get(k) ?? null,
    set: (k, v) => {
      store.set(k, v);
    },
  };
};

describe('draft', () => {
  it('loadDraft returns null when key absent', () => {
    expect(loadDraft(makeStorage())).toBeNull();
  });

  it('saveDraft then loadDraft round-trips content', () => {
    const s = makeStorage();
    saveDraft(s, '# hello');
    expect(loadDraft(s)).toBe('# hello');
  });

  it('saveDraft overwrites the previous value', () => {
    const s = makeStorage();
    saveDraft(s, 'first');
    saveDraft(s, 'second');
    expect(loadDraft(s)).toBe('second');
  });

  it('saveDraft can persist an empty string', () => {
    const s = makeStorage();
    saveDraft(s, '');
    expect(loadDraft(s)).toBe('');
  });

  it('clearDraft leaves the slot as an empty string, distinct from never-saved', () => {
    const s = makeStorage();
    saveDraft(s, 'something');
    clearDraft(s);
    expect(loadDraft(s)).toBe('');
  });

  it('clearDraft on an untouched storage leaves it as empty string', () => {
    const s = makeStorage();
    clearDraft(s);
    expect(loadDraft(s)).toBe('');
  });
});
