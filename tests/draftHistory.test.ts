import { describe, expect, it } from 'vitest';
import {
  formatAge,
  loadHistory,
  MAX_SNAPSHOTS,
  parseHistory,
  pushSnapshot,
  recordSnapshot,
  snapshotLabel,
} from '../src/draftHistory.ts';
import type { Storage } from '../src/ports.ts';

const makeStorage = (): Storage & { writes: number } => {
  const store = new Map<string, string>();
  const s = {
    writes: 0,
    get: (k: string) => store.get(k) ?? null,
    set: (k: string, v: string) => {
      s.writes++;
      store.set(k, v);
    },
  };
  return s;
};

describe('parseHistory', () => {
  it('returns [] for missing, malformed, or non-array data', () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory('{nope')).toEqual([]);
    expect(parseHistory('{"text":"a"}')).toEqual([]);
  });

  it('drops entries with the wrong shape', () => {
    const raw = JSON.stringify([{ text: 'ok', savedAt: 1 }, { text: 2 }, null, 'x']);
    expect(parseHistory(raw)).toEqual([{ text: 'ok', savedAt: 1 }]);
  });
});

describe('pushSnapshot', () => {
  it('prepends the newest snapshot', () => {
    const h = pushSnapshot(pushSnapshot([], 'a', 1), 'b', 2);
    expect(h.map((s) => s.text)).toEqual(['b', 'a']);
  });

  it('moves an identical snapshot to the front instead of duplicating', () => {
    const h = pushSnapshot(pushSnapshot(pushSnapshot([], 'a', 1), 'b', 2), 'a', 3);
    expect(h).toEqual([
      { text: 'a', savedAt: 3 },
      { text: 'b', savedAt: 2 },
    ]);
  });

  it('ignores blank text', () => {
    expect(pushSnapshot([{ text: 'a', savedAt: 1 }], '  \n', 2)).toEqual([
      { text: 'a', savedAt: 1 },
    ]);
  });

  it('caps the number of snapshots', () => {
    let h = pushSnapshot([], 'x0', 0);
    for (let i = 1; i < MAX_SNAPSHOTS + 5; i++) h = pushSnapshot(h, `x${i}`, i);
    expect(h).toHaveLength(MAX_SNAPSHOTS);
    expect(h[0]?.text).toBe(`x${MAX_SNAPSHOTS + 4}`);
  });

  it('drops the oldest snapshots once the character budget is spent', () => {
    const limits = { count: 10, chars: 10 };
    const h = pushSnapshot(pushSnapshot([], 'aaaaaa', 1, limits), 'bbbbbb', 2, limits);
    expect(h.map((s) => s.text)).toEqual(['bbbbbb']);
  });

  it('refuses a single snapshot larger than the budget', () => {
    expect(pushSnapshot([], 'too long', 1, { count: 10, chars: 3 })).toEqual([]);
  });
});

describe('recordSnapshot / loadHistory', () => {
  it('persists snapshots through the storage port', () => {
    const storage = makeStorage();
    recordSnapshot(storage, 'first', 1);
    recordSnapshot(storage, 'second', 2);
    expect(loadHistory(storage).map((s) => s.text)).toEqual(['second', 'first']);
  });

  it('does not write for blank text', () => {
    const storage = makeStorage();
    recordSnapshot(storage, '   ', 1);
    expect(storage.writes).toBe(0);
  });
});

describe('formatAge', () => {
  const now = 10 * 24 * 60 * 60_000;
  it.each([
    [now - 5_000, 'just now'],
    [now + 5_000, 'just now'],
    [now - 5 * 60_000, '5 min ago'],
    [now - 3 * 60 * 60_000, '3 h ago'],
    [now - 30 * 60 * 60_000, 'yesterday'],
    [now - 4 * 24 * 60 * 60_000, '4 days ago'],
  ])('formats %d', (savedAt, expected) => {
    expect(formatAge(savedAt, now)).toBe(expected);
  });
});

describe('snapshotLabel', () => {
  it('uses the document title when there is one', () => {
    expect(snapshotLabel('intro\n\n# Trip plan')).toBe('Trip plan');
  });

  it('falls back to the first line, truncated', () => {
    expect(snapshotLabel('\n  short note  \nmore')).toBe('short note');
    expect(snapshotLabel('x'.repeat(60))).toBe(`${'x'.repeat(48)}…`);
  });
});
