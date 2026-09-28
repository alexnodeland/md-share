import {
  applyCompletion,
  type Completion,
  type CompletionContext,
  completionContext,
  footnoteLabels,
  suggest,
} from '../completions.ts';
import type { DocHeading } from '../types.ts';
import { applyEdit } from './applyEdit.ts';
import { measureRange } from './measureRange.ts';

export interface AutocompleteDeps {
  editor: HTMLTextAreaElement;
  mirror: HTMLElement;
  wrap: HTMLElement;
  /** The outline from the latest render. */
  getHeadings: () => readonly DocHeading[];
}

const LIST_ID = 'editor-completions';

/**
 * Suggests heading slugs after `](#` and footnote labels after `[^`.
 * ↑/↓ choose, Enter/Tab accept, Esc dismisses.
 */
export const initAutocomplete = ({ editor, mirror, wrap, getHeadings }: AutocompleteDeps): void => {
  const list = document.createElement('ul');
  list.id = LIST_ID;
  list.className = 'completions';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Suggestions');
  list.hidden = true;
  wrap.append(list);
  editor.setAttribute('aria-autocomplete', 'list');
  editor.setAttribute('aria-controls', LIST_ID);

  let ctx: CompletionContext | null = null;
  let items: Completion[] = [];
  let active = 0;
  // Esc dismisses until the cursor leaves the reference.
  let dismissedAt: number | null = null;

  const close = () => {
    list.hidden = true;
    items = [];
    editor.removeAttribute('aria-activedescendant');
  };

  const render = () => {
    list.replaceChildren(
      ...items.map((item, i) => {
        const li = document.createElement('li');
        li.id = `${LIST_ID}-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === active));
        li.dataset.index = String(i);
        const label = document.createElement('span');
        label.className = 'completion-label';
        label.textContent = item.label;
        const detail = document.createElement('span');
        detail.className = 'completion-detail';
        detail.textContent = item.detail;
        li.append(label, detail);
        return li;
      }),
    );
    editor.setAttribute('aria-activedescendant', `${LIST_ID}-${active}`);
  };

  const position = () => {
    const caret = measureRange(mirror, editor.selectionStart, editor.selectionStart);
    if (!caret) return close();
    const box = wrap.getBoundingClientRect();
    list.style.left = `${Math.min(caret.left - box.left, box.width - 260)}px`;
    list.style.top = `${caret.bottom - box.top + 4}px`;
  };

  const refresh = () => {
    const cursor = editor.selectionStart;
    ctx =
      editor.selectionStart === editor.selectionEnd
        ? completionContext(editor.value, cursor)
        : null;
    if (!ctx || ctx.from === dismissedAt) return close();
    dismissedAt = null;
    items = suggest(ctx, getHeadings(), footnoteLabels(editor.value));
    if (items.length === 0) return close();
    active = 0;
    render();
    list.hidden = false;
    position();
  };

  const accept = (index: number) => {
    const choice = items[index];
    if (!ctx || !choice) return;
    applyEdit(editor, applyCompletion(editor.value, ctx, choice));
    close();
    editor.focus();
  };

  // Capture on the wrapper so this runs before the editor's own Tab/Enter handling.
  wrap.addEventListener(
    'keydown',
    (e) => {
      if (list.hidden || e.target !== editor) return;
      const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
      if (e.key in moves) {
        active = (active + (moves[e.key] as number) + items.length) % items.length;
        render();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        accept(active);
      } else if (e.key === 'Escape') {
        dismissedAt = ctx?.from ?? null;
        close();
      } else {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );
  // After the mirror repaints, so the caret measurement is current.
  editor.addEventListener('input', () => requestAnimationFrame(refresh));
  editor.addEventListener('click', refresh);
  editor.addEventListener('blur', () => setTimeout(close, 150));
  list.addEventListener('mousedown', (e) => {
    const option = (e.target as HTMLElement).closest<HTMLElement>('[data-index]');
    if (!option) return;
    e.preventDefault(); // keep focus in the editor
    accept(Number(option.dataset.index));
  });
};
