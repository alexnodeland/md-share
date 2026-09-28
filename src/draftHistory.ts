import { documentTitle } from './filename.ts';
import type { Storage } from './ports.ts';

export interface Snapshot {
  text: string;
  savedAt: number;
}

const HISTORY_KEY = 'md-share:history';
export const MAX_SNAPSHOTS = 10;
/** Keep the history well under the ~5 MB localStorage quota the draft shares. */
export const MAX_HISTORY_CHARS = 1_500_000;

const isSnapshot = (x: unknown): x is Snapshot =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as Snapshot).text === 'string' &&
  typeof (x as Snapshot).savedAt === 'number';

export const parseHistory = (raw: string | null): Snapshot[] => {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isSnapshot) : [];
  } catch {
    return [];
  }
};

/** Newest first; identical text moves to the front instead of duplicating. */
export const pushSnapshot = (
  history: readonly Snapshot[],
  text: string,
  now: number,
  limits = { count: MAX_SNAPSHOTS, chars: MAX_HISTORY_CHARS },
): Snapshot[] => {
  if (!text.trim() || text.length > limits.chars) return [...history];
  const next = [{ text, savedAt: now }, ...history.filter((s) => s.text !== text)];
  let total = 0;
  return next.slice(0, limits.count).filter((s) => {
    total += s.text.length;
    return total <= limits.chars;
  });
};

export const loadHistory = (storage: Storage): Snapshot[] => parseHistory(storage.get(HISTORY_KEY));

export const recordSnapshot = (storage: Storage, text: string, now: number): void => {
  if (!text.trim()) return;
  storage.set(HISTORY_KEY, JSON.stringify(pushSnapshot(loadHistory(storage), text, now)));
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const formatAge = (savedAt: number, now: number): string => {
  const diff = Math.max(0, now - savedAt);
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`;
  const days = Math.floor(diff / DAY);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};

const FIRST_LINE_MAX = 48;

export const snapshotLabel = (text: string): string => {
  const title = documentTitle(text);
  if (title) return title;
  const line = text.trim().split('\n', 1).join('').trim();
  return line.length > FIRST_LINE_MAX ? `${line.slice(0, FIRST_LINE_MAX)}…` : line;
};
