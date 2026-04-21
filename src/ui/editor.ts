import type { ImageCompressor } from '../adapters/imageCompress.ts';
import {
  continueIndent,
  continueList,
  type EditResult,
  isUrl,
  toggleWrap,
  wrap,
  wrapLink,
} from '../editorCommands.ts';
import { type CompleteContext, getSuggestions, type Suggestion } from '../editorComplete.ts';
import { insertImageAtCursor, isUnsafeImageMime } from '../imageEmbed.ts';
import type { HtmlToMd } from '../ports.ts';
import { applyEdit } from './applyEdit.ts';
import { initCompletePopup } from './completePopup.ts';
import { fmtBytes, IMAGE_EMBED_CONFIRM, IMAGE_MAX_DIM, IMAGE_QUALITY } from './imageConsts.ts';
import { showToast } from './toast.ts';

const RENDER_DEBOUNCE_MS = 180;
const HTML_PASTE_MIN_LEN = 16;

export type FormatCommand = 'bold' | 'italic' | 'code' | 'link';

export interface EditorDeps {
  onChange: () => void;
  highlightSource: (source: string) => string;
  compressImage: ImageCompressor;
  htmlToMd?: HtmlToMd;
  onFormatCommand?: (command: FormatCommand) => void;
  getCompleteContext?: () => CompleteContext;
}

const WRAP_MARKERS: Record<string, string> = {
  '*': '*',
  _: '_',
  '`': '`',
  '=': '=',
  '~': '~',
};

export const initEditor = ({
  onChange,
  highlightSource,
  compressImage,
  htmlToMd,
  onFormatCommand,
  getCompleteContext,
}: EditorDeps): (() => void) => {
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  if (!editor) return () => {};
  const mirror = document.getElementById('editor-mirror') as HTMLElement | null;
  const editorWrap = editor.parentElement;

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

  const acceptSuggestion = (s: Suggestion) => {
    const [rs, re] = s.replaceRange;
    apply({
      value: editor.value.slice(0, rs) + s.insertText + editor.value.slice(re),
      start: rs + s.insertText.length,
      end: rs + s.insertText.length,
    });
  };

  const popup =
    mirror && editorWrap && getCompleteContext
      ? initCompletePopup({
          editor,
          mirror,
          wrap: editorWrap,
          onAccept: acceptSuggestion,
        })
      : null;

  const refreshPopup = () => {
    if (!popup || !getCompleteContext) return;
    if (editor.selectionStart !== editor.selectionEnd) {
      popup.hide();
      return;
    }
    const suggestions = getSuggestions(editor.value, editor.selectionStart, getCompleteContext());
    popup.show(suggestions);
  };

  const hasModifier = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

  const tryHandleModifierKey = (e: KeyboardEvent): boolean => {
    if (!hasModifier(e) || e.altKey || e.shiftKey) return false;
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      apply(toggleWrap(editor.value, editor.selectionStart, editor.selectionEnd, '**'));
      onFormatCommand?.('bold');
      return true;
    }
    if (key === 'i') {
      e.preventDefault();
      apply(toggleWrap(editor.value, editor.selectionStart, editor.selectionEnd, '*'));
      onFormatCommand?.('italic');
      return true;
    }
    if (key === 'k') {
      e.preventDefault();
      apply(wrapLink(editor.value, editor.selectionStart, editor.selectionEnd, ''));
      onFormatCommand?.('link');
      return true;
    }
    return false;
  };

  const tryHandleWrapKey = (e: KeyboardEvent): boolean => {
    if (hasModifier(e) || e.altKey) return false;
    const s = editor.selectionStart;
    const eEnd = editor.selectionEnd;
    if (s === eEnd) return false;
    if (e.key === '[') {
      e.preventDefault();
      apply(wrapLink(editor.value, s, eEnd, ''));
      return true;
    }
    const marker = WRAP_MARKERS[e.key];
    if (marker) {
      e.preventDefault();
      apply(wrap(editor.value, s, eEnd, marker));
      return true;
    }
    return false;
  };

  const tryHandleEnter = (e: KeyboardEvent): boolean => {
    if (e.key !== 'Enter' || e.shiftKey || hasModifier(e) || e.altKey) return false;
    if (editor.selectionStart !== editor.selectionEnd) return false;
    const pos = editor.selectionStart;
    const r = continueList(editor.value, pos) ?? continueIndent(editor.value, pos);
    if (!r) return false;
    e.preventDefault();
    apply({ value: r.value, start: r.cursor, end: r.cursor });
    return true;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (popup?.handleKey(e)) return;
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
    if (tryHandleModifierKey(e)) return;
    if (tryHandleWrapKey(e)) return;
    tryHandleEnter(e);
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

  const insertTextAtCursor = (text: string) => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    apply({
      value: editor.value.slice(0, start) + text + editor.value.slice(end),
      start: start + text.length,
      end: start + text.length,
    });
  };

  const importHtmlPaste = async (html: string) => {
    if (!htmlToMd) return;
    try {
      const md = await htmlToMd.convert(html);
      if (!md) {
        showToast('Pasted HTML had no convertible content');
        return;
      }
      insertTextAtCursor(md);
      showToast('HTML converted to Markdown', true);
    } catch {
      showToast('Could not convert pasted HTML');
    }
  };

  // Returns true if the paste was handled as an image (and preventDefault called).
  const tryHandleImagePaste = (e: ClipboardEvent): boolean => {
    const items = e.clipboardData?.items;
    if (!items) return false;
    for (const item of items) {
      if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
      if (isUnsafeImageMime(item.type)) {
        e.preventDefault();
        showToast('SVG images cannot be pasted — they may contain scripts');
        return true;
      }
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        void embedImageFile(file);
        return true;
      }
    }
    return false;
  };

  const onPaste = (e: ClipboardEvent) => {
    if (tryHandleImagePaste(e)) return;
    const text = e.clipboardData?.getData('text/plain') ?? '';
    const html = e.clipboardData?.getData('text/html') ?? '';
    if (isUrl(text)) {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      if (start === end) return;
      e.preventDefault();
      apply(wrapLink(editor.value, start, end, text.trim()));
      return;
    }
    if (htmlToMd && html.length >= HTML_PASTE_MIN_LEN && /<[a-z][^>]*>/i.test(html)) {
      e.preventDefault();
      void importHtmlPaste(html);
    }
  };

  const onInput = () => {
    scheduleMirror();
    scheduleChange();
    refreshPopup();
  };

  const onBlur = () => {
    popup?.hide();
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
  editor.addEventListener('blur', onBlur);
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
    editor.removeEventListener('blur', onBlur);
    editor.removeEventListener('compositionstart', onCompositionStart);
    editor.removeEventListener('compositionend', onCompositionEnd);
    popup?.destroy();
  };
};
