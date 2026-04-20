import { findAll, findNext, findPrev, type Match, replaceAll, replaceOne } from '../editorFind.ts';
import { applyEdit } from './applyEdit.ts';

export interface FindBarDeps {
  editor: HTMLTextAreaElement;
  onEditorChange: () => void;
}

export interface FindBar {
  open(mode: 'find' | 'replace'): void;
  close(): void;
  isOpen(): boolean;
}

export const initFindBar = ({ editor, onEditorChange }: FindBarDeps): FindBar => {
  const bar = document.getElementById('find-bar');
  const findInput = document.getElementById('find-input') as HTMLInputElement | null;
  const replaceInput = document.getElementById('find-replace-input') as HTMLInputElement | null;
  const caseCheckbox = document.getElementById('find-case') as HTMLInputElement | null;
  const statusEl = document.getElementById('find-status');
  const prevBtn = document.getElementById('find-prev');
  const nextBtn = document.getElementById('find-next');
  const replaceOneBtn = document.getElementById('find-replace-one');
  const replaceAllBtn = document.getElementById('find-replace-all');
  const closeBtn = document.getElementById('find-close');

  const mirror = document.getElementById('editor-mirror');
  const overlay = document.getElementById('find-match-overlay');
  const wrap = editor.parentElement;

  if (
    !bar ||
    !findInput ||
    !replaceInput ||
    !caseCheckbox ||
    !statusEl ||
    !prevBtn ||
    !nextBtn ||
    !replaceOneBtn ||
    !replaceAllBtn ||
    !closeBtn ||
    !mirror ||
    !overlay ||
    !wrap
  ) {
    return { open: () => {}, close: () => {}, isOpen: () => false };
  }

  const hideOverlay = () => {
    overlay.classList.remove('visible');
  };

  const positionOverlay = (start: number, end: number) => {
    const walker = document.createTreeWalker(mirror, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let startNode: Text | null = null;
    let startInner = 0;
    let endNode: Text | null = null;
    let endInner = 0;
    let node = walker.nextNode() as Text | null;
    while (node) {
      const len = node.data.length;
      if (!startNode && offset + len >= start) {
        startNode = node;
        startInner = start - offset;
      }
      if (offset + len >= end) {
        endNode = node;
        endInner = end - offset;
        break;
      }
      offset += len;
      node = walker.nextNode() as Text | null;
    }
    if (!startNode || !endNode) {
      hideOverlay();
      return;
    }
    const range = document.createRange();
    range.setStart(startNode, startInner);
    range.setEnd(endNode, endInner);
    let rect = range.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      hideOverlay();
      return;
    }
    const padding = 32;
    const viewportHeight = wrap.clientHeight;
    const relTop = rect.top - wrapRect.top;
    const relBottom = rect.bottom - wrapRect.top;
    let scrollDelta = 0;
    if (relTop < padding) scrollDelta = relTop - padding;
    else if (relBottom > viewportHeight - padding)
      scrollDelta = relBottom - (viewportHeight - padding);
    if (scrollDelta !== 0) {
      editor.scrollTop = Math.max(0, editor.scrollTop + scrollDelta);
      mirror.scrollTop = editor.scrollTop;
      rect = range.getBoundingClientRect();
    }
    overlay.style.top = `${rect.top - wrapRect.top - 1}px`;
    overlay.style.left = `${rect.left - wrapRect.left - 1}px`;
    overlay.style.width = `${rect.width + 2}px`;
    overlay.style.height = `${rect.height + 2}px`;
    overlay.classList.add('visible');
  };

  let openMode: 'find' | 'replace' | null = null;
  const getMode = () => openMode;

  const opts = () => ({ caseSensitive: caseCheckbox.checked });

  const updateStatus = () => {
    if (!findInput.value) {
      statusEl.textContent = '';
      return;
    }
    const matches = findAll(editor.value, findInput.value, opts());
    if (matches.length === 0) {
      statusEl.textContent = 'No results';
      return;
    }
    const pos = editor.selectionStart;
    const idx = matches.findIndex((m) => m.start <= pos && pos <= m.end);
    statusEl.textContent = `${idx === -1 ? 0 : idx + 1} / ${matches.length}`;
  };

  const select = (match: Match | null) => {
    if (!match) {
      hideOverlay();
      updateStatus();
      return;
    }
    editor.focus();
    editor.setSelectionRange(match.start, match.end);
    editor.scrollTop = Math.max(0, editor.scrollTop);
    positionOverlay(match.start, match.end);
    updateStatus();
    findInput.focus();
  };

  const goNext = () => select(findNext(editor.value, findInput.value, editor.selectionEnd, opts()));
  const goPrev = () =>
    select(findPrev(editor.value, findInput.value, editor.selectionStart, opts()));

  const targetMatch = (matches: Match[], pos: number): Match =>
    matches.find((m) => m.start <= pos && pos <= m.end) ??
    matches.find((m) => m.start >= pos) ??
    (matches[0] as Match);

  const doReplaceOne = () => {
    if (!findInput.value) return;
    const matches = findAll(editor.value, findInput.value, opts());
    if (matches.length === 0) return;
    const target = targetMatch(matches, editor.selectionStart);
    const { value, cursor } = replaceOne(editor.value, target, replaceInput.value);
    applyEdit(editor, { value, start: cursor, end: cursor });
    onEditorChange();
    goNext();
  };

  const doReplaceAll = () => {
    if (!findInput.value) return;
    const { value, count } = replaceAll(editor.value, findInput.value, replaceInput.value, opts());
    if (count === 0) return;
    applyEdit(editor, { value, start: editor.selectionStart, end: editor.selectionEnd });
    onEditorChange();
    statusEl.textContent = `Replaced ${count}`;
    findInput.focus();
  };

  const open = (mode: 'find' | 'replace') => {
    openMode = mode;
    bar.classList.add('visible');
    bar.dataset.mode = mode;
    const sel = editor.value.substring(editor.selectionStart, editor.selectionEnd);
    if (sel && sel.length <= 200 && !sel.includes('\n')) findInput.value = sel;
    findInput.focus();
    findInput.select();
    updateStatus();
  };

  const close = () => {
    openMode = null;
    bar.classList.remove('visible');
    hideOverlay();
    editor.focus();
  };

  const isOpen = () => openMode !== null;

  findInput.addEventListener('input', () => {
    updateStatus();
    if (!findInput.value) {
      hideOverlay();
      return;
    }
    const match = findNext(editor.value, findInput.value, editor.selectionStart, opts());
    if (match) {
      editor.setSelectionRange(match.start, match.end);
      positionOverlay(match.start, match.end);
      updateStatus();
    } else {
      hideOverlay();
    }
  });
  caseCheckbox.addEventListener('change', updateStatus);

  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) goPrev();
      else goNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.altKey) doReplaceAll();
      else doReplaceOne();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);
  replaceOneBtn.addEventListener('click', doReplaceOne);
  replaceAllBtn.addEventListener('click', doReplaceAll);
  closeBtn.addEventListener('click', close);

  const isMac = /Mac|iP(ad|od|hone)/.test(navigator.platform);

  const editorHasFocus = () => {
    const active = document.activeElement;
    return active === editor || active === findInput || active === replaceInput;
  };

  const progressiveFind = () => {
    const mode = getMode();
    if (mode === null) open('find');
    else if (mode === 'find') open('replace');
    else close();
  };

  document.addEventListener(
    'keydown',
    (e) => {
      if (!editorHasFocus() && !isOpen()) return;
      const primary = isMac
        ? e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey
        : e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
      if (!primary) return;
      if (e.code === 'KeyF') {
        e.preventDefault();
        e.stopPropagation();
        progressiveFind();
      }
    },
    { capture: true },
  );

  return { open, close, isOpen };
};
