import type { ImageCompressor } from '../adapters/imageCompress.ts';
import {
  continueIndent,
  continueList,
  type EditResult,
  isUrl,
  toggleWrap,
  wrapLink,
} from '../editorCommands.ts';
import { insertImageAtCursor } from '../imageEmbed.ts';
import { applyEdit } from './applyEdit.ts';
import { fmtBytes, IMAGE_EMBED_CONFIRM, IMAGE_MAX_DIM, IMAGE_QUALITY } from './imageConsts.ts';
import { showToast } from './toast.ts';

const RENDER_DEBOUNCE_MS = 180;

export type FormatCommand = 'bold' | 'italic' | 'code' | 'link';

export interface EditorDeps {
  onChange: () => void;
  highlightSource: (source: string) => string;
  compressImage: ImageCompressor;
  onFormatCommand?: (command: FormatCommand) => void;
}

export const initEditor = ({
  onChange,
  highlightSource,
  compressImage,
  onFormatCommand,
}: EditorDeps): (() => void) => {
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  if (!editor) return () => {};
  const mirror = document.getElementById('editor-mirror') as HTMLElement | null;

  let debounceTimer: number | undefined;
  const scheduleChange = () => {
    if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(onChange, RENDER_DEBOUNCE_MS);
  };

  let composing = false;
  let rafHandle: number | undefined;
  const syncScroll = () => {
    if (!mirror) return;
    mirror.scrollTop = editor.scrollTop;
    mirror.scrollLeft = editor.scrollLeft;
  };
  const paintMirror = () => {
    rafHandle = undefined;
    if (!mirror || composing) return;
    mirror.innerHTML = highlightSource(editor.value);
    syncScroll();
  };
  const scheduleMirror = () => {
    if (!mirror || composing) return;
    if (rafHandle !== undefined) return;
    rafHandle = window.requestAnimationFrame(paintMirror);
  };

  const apply = (r: EditResult) => {
    applyEdit(editor, r);
  };

  const hasModifier = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      const eEnd = editor.selectionEnd;
      apply({
        value: `${editor.value.substring(0, s)}  ${editor.value.substring(eEnd)}`,
        start: s + 2,
        end: s + 2,
      });
      return;
    }
    if (hasModifier(e) && !e.altKey && !e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        apply(toggleWrap(editor.value, editor.selectionStart, editor.selectionEnd, '**'));
        onFormatCommand?.('bold');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        apply(toggleWrap(editor.value, editor.selectionStart, editor.selectionEnd, '*'));
        onFormatCommand?.('italic');
        return;
      }
      if (key === 'k') {
        e.preventDefault();
        apply(wrapLink(editor.value, editor.selectionStart, editor.selectionEnd, ''));
        onFormatCommand?.('link');
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

  const embedImageFile = async (file: File) => {
    if (!window.confirm(IMAGE_EMBED_CONFIRM)) return;
    try {
      const { dataUrl, bytes, originalBytes } = await compressImage(file, {
        maxDim: IMAGE_MAX_DIM,
        quality: IMAGE_QUALITY,
      });
      const r = insertImageAtCursor(
        editor.value,
        editor.selectionStart,
        editor.selectionEnd,
        dataUrl,
      );
      apply({ value: r.value, start: r.cursor, end: r.cursor });
      showToast(`Image embedded: ${fmtBytes(originalBytes)} → ${fmtBytes(bytes)}`, true);
    } catch {
      showToast('Could not embed image — unsupported format');
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void embedImageFile(file);
            return;
          }
        }
      }
    }
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!isUrl(text)) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return;
    e.preventDefault();
    apply(wrapLink(editor.value, start, end, text.trim()));
  };

  const onInput = () => {
    scheduleMirror();
    scheduleChange();
  };

  const onCompositionStart = () => {
    composing = true;
  };
  const onCompositionEnd = () => {
    composing = false;
    scheduleMirror();
  };

  editor.addEventListener('keydown', onKeyDown);
  editor.addEventListener('paste', onPaste);
  editor.addEventListener('input', onInput);
  editor.addEventListener('scroll', syncScroll);
  editor.addEventListener('compositionstart', onCompositionStart);
  editor.addEventListener('compositionend', onCompositionEnd);

  if (mirror) mirror.innerHTML = highlightSource(editor.value);

  return () => {
    if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    if (rafHandle !== undefined) window.cancelAnimationFrame(rafHandle);
    editor.removeEventListener('keydown', onKeyDown);
    editor.removeEventListener('paste', onPaste);
    editor.removeEventListener('input', onInput);
    editor.removeEventListener('scroll', syncScroll);
    editor.removeEventListener('compositionstart', onCompositionStart);
    editor.removeEventListener('compositionend', onCompositionEnd);
  };
};
