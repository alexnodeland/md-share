import {
  continueIndent,
  continueList,
  type EditResult,
  isUrl,
  toggleWrap,
  wrapLink,
} from '../editorCommands.ts';

const RENDER_DEBOUNCE_MS = 180;

export interface EditorDeps {
  onChange: () => void;
}

export const initEditor = ({ onChange }: EditorDeps): (() => void) => {
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  if (!editor) return () => {};

  let debounceTimer: number | undefined;
  const scheduleChange = () => {
    if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(onChange, RENDER_DEBOUNCE_MS);
  };

  const apply = (r: EditResult) => {
    editor.value = r.value;
    editor.selectionStart = r.start;
    editor.selectionEnd = r.end;
    scheduleChange();
  };

  const hasModifier = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      editor.value = `${editor.value.substring(0, s)}  ${editor.value.substring(editor.selectionEnd)}`;
      editor.selectionStart = editor.selectionEnd = s + 2;
      scheduleChange();
      return;
    }
    if (hasModifier(e) && !e.altKey && !e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        apply(toggleWrap(editor.value, editor.selectionStart, editor.selectionEnd, '**'));
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        apply(toggleWrap(editor.value, editor.selectionStart, editor.selectionEnd, '*'));
        return;
      }
      if (key === 'k') {
        e.preventDefault();
        apply(wrapLink(editor.value, editor.selectionStart, editor.selectionEnd, ''));
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !hasModifier(e) && !e.altKey) {
      if (editor.selectionStart !== editor.selectionEnd) return;
      const pos = editor.selectionStart;
      const r = continueList(editor.value, pos) ?? continueIndent(editor.value, pos);
      if (!r) return;
      e.preventDefault();
      apply({ value: r.value, start: r.cursor, end: r.cursor });
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!isUrl(text)) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return;
    e.preventDefault();
    apply(wrapLink(editor.value, start, end, text.trim()));
  };

  editor.addEventListener('keydown', onKeyDown);
  editor.addEventListener('paste', onPaste);
  editor.addEventListener('input', scheduleChange);

  return () => {
    if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    editor.removeEventListener('keydown', onKeyDown);
    editor.removeEventListener('paste', onPaste);
    editor.removeEventListener('input', scheduleChange);
  };
};
