export interface UndoSnapshot {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface UndoStack {
  push(snapshot: UndoSnapshot): void;
  undo(current: UndoSnapshot): UndoSnapshot | null;
  redo(current: UndoSnapshot): UndoSnapshot | null;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

export const createUndoStack = (maxSize = 200): UndoStack => {
  const past: UndoSnapshot[] = [];
  const future: UndoSnapshot[] = [];

  return {
    push(snapshot) {
      past.push(snapshot);
      if (past.length > maxSize) past.shift();
      future.length = 0;
    },
    undo(current) {
      const prev = past.pop();
      if (!prev) return null;
      future.push(current);
      return prev;
    },
    redo(current) {
      const next = future.pop();
      if (!next) return null;
      past.push(current);
      return next;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past.length = 0;
      future.length = 0;
    },
  };
};
