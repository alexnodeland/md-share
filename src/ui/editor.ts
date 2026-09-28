import type { ImageCompressor } from '../adapters/imageCompress.ts';
import {
  continueIndent,
  continueList,
  type EditResult,
  indentLines,
  isUrl,
  outdentLines,
  toggleWrap,
  wrapLink,
} from '../editorCommands.ts';
import { insertImageAtCursor } from '../imageEmbed.ts';
import type { HtmlToMarkdown } from '../ports.ts';
import { isWorthConverting, shouldPasteAsMarkdown } from '../richPaste.ts';
import { applyEdit } from './applyEdit.ts';
import { fmtBytes, IMAGE_EMBED_CONFIRM, IMAGE_MAX_DIM, IMAGE_QUALITY } from './imageConsts.ts';
import { showToast } from './toast.ts';

const RENDER_DEBOUNCE_MS = 180;

export type FormatCommand = 'bold' | 'italic' | 'code' | 'link';

export interface EditorDeps {
  onChange: () => void;
  highlightSource: (source: string) => string;
  compressImage: ImageCompressor;
  htmlToMarkdown: HtmlToMarkdown;
  onFormatCommand?: (command: FormatCommand) => void;
}

export const initEditor = ({
  onChange,
  highlightSource,
  compressImage,
  htmlToMarkdown,
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

  // Esc, then Tab, moves focus out of the editor — otherwise keyboard users
  // are trapped, since Tab indents.
  let tabLeaves = false;

  const onTab = (e: KeyboardEvent) => {
    e.preventDefault();
    const { value, selectionStart: s, selectionEnd: end } = editor;
    if (e.shiftKey) apply(outdentLines(value, s, end));
    else if (s !== end) apply(indentLines(value, s, end));
    else apply({ value: `${value.slice(0, s)}  ${value.slice(end)}`, start: s + 2, end: s + 2 });
  };

  const FORMATS: Record<string, { command: FormatCommand; run: () => EditResult }> = {
    b: {
      command: 'bold',
      run: () => toggleWrap(editor.value, editor.selectionStart, editor.selectionEnd, '**'),
    },
    i: {
      command: 'italic',
      run: () => toggleWrap(editor.value, editor.selectionStart, editor.selectionEnd, '*'),
    },
    k: {
      command: 'link',
      run: () => wrapLink(editor.value, editor.selectionStart, editor.selectionEnd, ''),
    },
  };

  const onFormat = (e: KeyboardEvent) => {
    const format = FORMATS[e.key.toLowerCase()];
    if (!format) return;
    e.preventDefault();
    apply(format.run());
    onFormatCommand?.(format.command);
  };

  const onEnter = (e: KeyboardEvent) => {
    if (editor.selectionStart !== editor.selectionEnd) return;
    const pos = editor.selectionStart;
    const r = continueList(editor.value, pos) ?? continueIndent(editor.value, pos);
    if (!r) return;
    e.preventDefault();
    apply({ value: r.value, start: r.cursor, end: r.cursor });
  };

  // Mod+Shift+V asks for plain text: the paste event itself can't tell.
  let plainPaste = false;

  const onKeyDown = (e: KeyboardEvent) => {
    // Enter while an IME is composing confirms the candidate; leave it alone.
    if (e.isComposing) return;
    plainPaste = hasModifier(e) && e.shiftKey && e.key.toLowerCase() === 'v';
    const leaving = tabLeaves;
    tabLeaves = e.key === 'Escape';
    const plain = !hasModifier(e) && !e.altKey;
    if (e.key === 'Tab' && plain && !leaving) onTab(e);
    else if (hasModifier(e) && !e.altKey && !e.shiftKey) onFormat(e);
    else if (e.key === 'Enter' && plain && !e.shiftKey) onEnter(e);
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

  /** Rich text (Docs, Word, web pages) arrives as HTML; paste it as Markdown. */
  const pasteAsMarkdown = (html: string, plain: string) => {
    const { selectionStart: start, selectionEnd: end, value: before } = editor;
    const insert = (text: string, converted: boolean) => {
      const unchanged = editor.value === before;
      const s = unchanged ? start : editor.selectionStart;
      const eEnd = unchanged ? end : editor.selectionEnd;
      const cursor = s + text.length;
      apply({
        value: editor.value.slice(0, s) + text + editor.value.slice(eEnd),
        start: cursor,
        end: cursor,
      });
      if (converted) showToast('Pasted as Markdown — add Shift to paste plain text', true);
    };
    htmlToMarkdown
      .convert(html)
      .then((md) => (md && isWorthConverting(md, plain) ? insert(md, true) : insert(plain, false)))
      .catch(() => insert(plain, false));
  };

  const onPaste = (e: ClipboardEvent) => {
    const html = e.clipboardData?.getData('text/html') ?? '';
    const plain = e.clipboardData?.getData('text/plain') ?? '';
    const wantsPlain = plainPaste;
    plainPaste = false;
    if (!wantsPlain && shouldPasteAsMarkdown(html, plain)) {
      e.preventDefault();
      pasteAsMarkdown(html, plain);
      return;
    }
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
    if (!isUrl(plain)) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return;
    e.preventDefault();
    apply(wrapLink(editor.value, start, end, plain.trim()));
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
