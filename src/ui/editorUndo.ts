import { createUndoStack, type UndoSnapshot } from '../undoStack.ts';

export interface EditorUndoDeps {
  editor: HTMLTextAreaElement;
}

const PAUSE_MS = 400;
const MAX_SNAPSHOTS = 400;
const CHUNK_BOUNDARY = /[\s.,;:!?()[\]{}"'`]/;

export const initEditorUndo = ({ editor }: EditorUndoDeps): void => {
  const stack = createUndoStack(MAX_SNAPSHOTS);

  const snapshot = (): UndoSnapshot => ({
    value: editor.value,
    selectionStart: editor.selectionStart,
    selectionEnd: editor.selectionEnd,
  });

  let lastSnapshot: UndoSnapshot = snapshot();
  let pendingChunkStart: UndoSnapshot | null = null;
  let pauseTimer: number | undefined;
  let composing = false;
  let suppressInputHandler = false;
  let lastInputKind: 'insert' | 'delete' | null = null;

  const clearPauseTimer = () => {
    if (pauseTimer !== undefined) {
      window.clearTimeout(pauseTimer);
      pauseTimer = undefined;
    }
  };

  const flushPending = () => {
    clearPauseTimer();
    if (pendingChunkStart !== null) {
      stack.push(pendingChunkStart);
      pendingChunkStart = null;
    }
    lastInputKind = null;
  };

  const restore = (s: UndoSnapshot) => {
    suppressInputHandler = true;
    editor.value = s.value;
    editor.setSelectionRange(s.selectionStart, s.selectionEnd);
    editor.dispatchEvent(new Event('input'));
    suppressInputHandler = false;
    lastSnapshot = s;
    pendingChunkStart = null;
    lastInputKind = null;
    clearPauseTimer();
  };

  editor.addEventListener('input', (e) => {
    if (suppressInputHandler) return;
    if (composing) return;
    const current = snapshot();
    if (current.value === lastSnapshot.value) {
      lastSnapshot = current;
      return;
    }
    const nativeInput = e instanceof InputEvent;
    if (!nativeInput) {
      flushPending();
      stack.push(lastSnapshot);
      lastSnapshot = current;
      return;
    }
    const inputType = e.inputType;
    const data = e.data;
    const isPaste = inputType === 'insertFromPaste' || inputType === 'insertFromDrop';
    const isLineBreak =
      inputType === 'insertLineBreak' || inputType === 'insertParagraph' || data === '\n';
    const isBoundaryChar = data !== null && data.length > 0 && CHUNK_BOUNDARY.test(data);
    const isDelete = typeof inputType === 'string' && inputType.startsWith('delete');
    if (isPaste || isLineBreak) {
      flushPending();
      stack.push(lastSnapshot);
      lastSnapshot = current;
      return;
    }
    const currentKind: 'insert' | 'delete' = isDelete ? 'delete' : 'insert';
    if (lastInputKind !== null && lastInputKind !== currentKind) {
      flushPending();
    }
    lastInputKind = currentKind;
    if (pendingChunkStart === null) pendingChunkStart = lastSnapshot;
    lastSnapshot = current;
    if (!isDelete && isBoundaryChar) {
      flushPending();
      return;
    }
    clearPauseTimer();
    pauseTimer = window.setTimeout(flushPending, PAUSE_MS);
  });

  editor.addEventListener('compositionstart', () => {
    composing = true;
  });
  editor.addEventListener('compositionend', () => {
    composing = false;
    const current = snapshot();
    if (current.value === lastSnapshot.value) return;
    if (pendingChunkStart === null) pendingChunkStart = lastSnapshot;
    lastSnapshot = current;
    flushPending();
  });

  editor.addEventListener('blur', () => {
    flushPending();
  });

  editor.addEventListener(
    'keydown',
    (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const isUndo = key === 'z' && !e.shiftKey && !e.altKey;
      const isRedo = (key === 'z' && e.shiftKey && !e.altKey) || (key === 'y' && !e.altKey);
      if (!isUndo && !isRedo) return;
      e.preventDefault();
      e.stopPropagation();
      flushPending();
      if (isUndo) {
        const prev = stack.undo(lastSnapshot);
        if (prev) restore(prev);
      } else {
        const next = stack.redo(lastSnapshot);
        if (next) restore(next);
      }
    },
    { capture: true },
  );
};
