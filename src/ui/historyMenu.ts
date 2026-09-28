import { formatAge, loadHistory, type Snapshot, snapshotLabel } from '../draftHistory.ts';
import type { Storage } from '../ports.ts';

export interface HistoryMenuDeps {
  storage: Storage;
  now: () => number;
  onRestore: (text: string) => void;
}

const wordCount = (text: string): number => text.match(/\S+/g)?.length ?? 0;

const renderItem = (snap: Snapshot, index: number, now: number): HTMLButtonElement => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('role', 'menuitem');
  btn.dataset.index = String(index);
  btn.className = 'history-item';
  const title = document.createElement('span');
  title.className = 'history-title';
  title.textContent = snapshotLabel(snap.text) || 'Untitled';
  const meta = document.createElement('span');
  meta.className = 'history-meta';
  const words = wordCount(snap.text);
  meta.textContent = `${formatAge(snap.savedAt, now)} · ${words === 1 ? '1 word' : `${words} words`}`;
  btn.append(title, meta);
  return btn;
};

/**
 * Must run before `initDropdowns` so the list is rebuilt before the dropdown
 * opens and focuses its first item.
 */
export const initHistoryMenu = ({ storage, now, onRestore }: HistoryMenuDeps): void => {
  const trigger = document.getElementById('btn-history');
  const menu = document.getElementById('history-menu');
  if (!trigger || !menu) return;
  let snapshots: Snapshot[] = [];

  const render = () => {
    snapshots = loadHistory(storage);
    const t = now();
    if (snapshots.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent =
        'Nothing yet. Loading a sample, clearing, dropping a file, or opening a shared link saves your previous text here.';
      menu.replaceChildren(empty);
      return;
    }
    menu.replaceChildren(...snapshots.map((s, i) => renderItem(s, i, t)));
  };

  trigger.addEventListener('click', render);
  trigger.addEventListener('keydown', render);
  menu.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-index]');
    const snap = item ? snapshots[Number(item.dataset.index)] : undefined;
    if (snap) onRestore(snap.text);
  });
};
