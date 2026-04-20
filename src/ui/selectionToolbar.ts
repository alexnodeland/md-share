import { type EditResult, toggleWrap, wrapLink } from '../editorCommands.ts';
import { applyEdit } from './applyEdit.ts';

export type ToolbarCommand = 'bold' | 'italic' | 'code' | 'link';

export interface SelectionToolbarDeps {
  editor: HTMLTextAreaElement;
  mirror: HTMLElement;
  wrap: HTMLElement;
}

export interface SelectionToolbar {
  pulse(command: ToolbarCommand): void;
  destroy(): void;
}

const OFFSCREEN = -9999;
const GAP = 8;
const EDGE_PADDING = 4;

const measureRange = (mirror: HTMLElement, start: number, end: number): DOMRect | null => {
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
  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startInner);
  range.setEnd(endNode, endInner);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
};

export const initSelectionToolbar = ({
  editor,
  mirror,
  wrap,
}: SelectionToolbarDeps): SelectionToolbar => {
  const bar = document.createElement('div');
  bar.className = 'selection-toolbar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Format selection');
  bar.dataset.visible = 'false';

  const makeButton = (cmd: ToolbarCommand, label: string, body: string): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'selection-toolbar-btn';
    btn.dataset.command = cmd;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.innerHTML = body;
    return btn;
  };

  const boldBtn = makeButton(
    'bold',
    'Bold',
    '<span class="sel-tb-glyph sel-tb-glyph-bold">B</span>',
  );
  const italicBtn = makeButton(
    'italic',
    'Italic',
    '<span class="sel-tb-glyph sel-tb-glyph-italic">I</span>',
  );
  const codeBtn = makeButton(
    'code',
    'Inline code',
    '<span class="sel-tb-glyph sel-tb-glyph-code">&lt;/&gt;</span>',
  );
  const linkBtn = makeButton(
    'link',
    'Link',
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>' +
      '<path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>' +
      '</svg>',
  );

  bar.append(boldBtn, italicBtn, codeBtn, linkBtn);
  wrap.appendChild(bar);

  const buttons: Record<ToolbarCommand, HTMLButtonElement> = {
    bold: boldBtn,
    italic: italicBtn,
    code: codeBtn,
    link: linkBtn,
  };

  const hide = () => {
    if (bar.dataset.visible === 'false') return;
    bar.dataset.visible = 'false';
  };

  const reposition = () => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end || document.activeElement !== editor) {
      hide();
      return;
    }
    const sel = measureRange(mirror, start, end);
    if (!sel) {
      hide();
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    bar.dataset.visible = 'measuring';
    bar.style.top = `${OFFSCREEN}px`;
    bar.style.left = `${OFFSCREEN}px`;
    const barRect = bar.getBoundingClientRect();
    const aboveTop = sel.top - wrapRect.top - barRect.height - GAP;
    const flipped = aboveTop < EDGE_PADDING;
    const top = flipped ? sel.bottom - wrapRect.top + GAP : aboveTop;
    let left = sel.left - wrapRect.left + sel.width / 2 - barRect.width / 2;
    const maxLeft = wrap.clientWidth - barRect.width - EDGE_PADDING;
    left = Math.max(EDGE_PADDING, Math.min(left, maxLeft));
    bar.style.top = `${top}px`;
    bar.style.left = `${left}px`;
    bar.dataset.visible = 'true';
  };

  let frame: number | undefined;
  const scheduleReposition = () => {
    if (frame !== undefined) return;
    frame = window.requestAnimationFrame(() => {
      frame = undefined;
      reposition();
    });
  };

  const apply = (r: EditResult) => {
    applyEdit(editor, r);
    scheduleReposition();
  };

  const pulse = (cmd: ToolbarCommand) => {
    const btn = buttons[cmd];
    btn.classList.remove('pulse');
    void btn.offsetWidth;
    btn.classList.add('pulse');
  };

  const runCommand = (cmd: ToolbarCommand) => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (start === end) return;
    if (cmd === 'bold') apply(toggleWrap(editor.value, start, end, '**'));
    else if (cmd === 'italic') apply(toggleWrap(editor.value, start, end, '*'));
    else if (cmd === 'code') apply(toggleWrap(editor.value, start, end, '`'));
    else apply(wrapLink(editor.value, start, end, ''));
    pulse(cmd);
    editor.focus();
  };

  for (const btn of [boldBtn, italicBtn, codeBtn, linkBtn]) {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.command as ToolbarCommand;
      runCommand(cmd);
    });
  }

  const onSelectionChange = () => {
    if (document.activeElement !== editor) {
      hide();
      return;
    }
    scheduleReposition();
  };

  const onEditorBlur = (e: FocusEvent) => {
    if (e.relatedTarget instanceof Node && bar.contains(e.relatedTarget)) return;
    hide();
  };

  const onEditorFocus = () => {
    scheduleReposition();
  };

  const onEditorInput = () => {
    scheduleReposition();
  };

  const onEditorScroll = () => {
    scheduleReposition();
  };

  const onEditorKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') hide();
  };

  const onResize = () => {
    scheduleReposition();
  };

  document.addEventListener('selectionchange', onSelectionChange);
  editor.addEventListener('blur', onEditorBlur);
  editor.addEventListener('focus', onEditorFocus);
  editor.addEventListener('input', onEditorInput);
  editor.addEventListener('scroll', onEditorScroll);
  editor.addEventListener('keydown', onEditorKeyDown);
  window.addEventListener('resize', onResize);

  return {
    pulse,
    destroy: () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', onSelectionChange);
      editor.removeEventListener('blur', onEditorBlur);
      editor.removeEventListener('focus', onEditorFocus);
      editor.removeEventListener('input', onEditorInput);
      editor.removeEventListener('scroll', onEditorScroll);
      editor.removeEventListener('keydown', onEditorKeyDown);
      window.removeEventListener('resize', onResize);
      bar.remove();
    },
  };
};
