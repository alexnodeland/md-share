import type { Suggestion } from '../editorComplete.ts';

export interface CompletePopupDeps {
  editor: HTMLTextAreaElement;
  mirror: HTMLElement;
  wrap: HTMLElement;
  onAccept: (s: Suggestion) => void;
}

export interface CompletePopup {
  show(suggestions: Suggestion[]): void;
  hide(): void;
  isVisible(): boolean;
  handleKey(e: KeyboardEvent): boolean;
  destroy(): void;
}

const GAP = 4;
const EDGE = 4;
const OFFSCREEN = -9999;

const measureCursor = (mirror: HTMLElement, pos: number): DOMRect | null => {
  const walker = document.createTreeWalker(mirror, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    if (offset + len >= pos) {
      const range = document.createRange();
      range.setStart(node, pos - offset);
      range.setEnd(node, pos - offset);
      return range.getBoundingClientRect();
    }
    offset += len;
    node = walker.nextNode() as Text | null;
  }
  return null;
};

export const initCompletePopup = ({
  editor,
  mirror,
  wrap,
  onAccept,
}: CompletePopupDeps): CompletePopup => {
  const pop = document.createElement('div');
  pop.className = 'complete-popup';
  pop.setAttribute('role', 'listbox');
  pop.setAttribute('aria-label', 'Autocomplete');
  pop.dataset.visible = 'false';
  wrap.appendChild(pop);

  let items: Suggestion[] = [];
  let active = 0;

  const render = () => {
    pop.replaceChildren();
    items.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'complete-popup-row';
      row.setAttribute('role', 'option');
      row.dataset.index = String(i);
      if (i === active) {
        row.classList.add('active');
        row.setAttribute('aria-selected', 'true');
      }
      row.textContent = s.display;
      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        active = i;
        accept();
      });
      pop.appendChild(row);
    });
  };

  const position = () => {
    const rect = measureCursor(mirror, editor.selectionStart);
    if (!rect) {
      hide();
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    pop.style.top = `${OFFSCREEN}px`;
    pop.style.left = `${OFFSCREEN}px`;
    pop.dataset.visible = 'measuring';
    const popRect = pop.getBoundingClientRect();
    let top = rect.bottom - wrapRect.top + GAP;
    if (top + popRect.height > wrap.clientHeight - EDGE) {
      top = rect.top - wrapRect.top - popRect.height - GAP;
    }
    top = Math.max(EDGE, Math.min(top, wrap.clientHeight - popRect.height - EDGE));
    let left = rect.left - wrapRect.left;
    const maxLeft = wrap.clientWidth - popRect.width - EDGE;
    left = Math.max(EDGE, Math.min(left, maxLeft));
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    pop.dataset.visible = 'true';
  };

  const hide = () => {
    if (pop.dataset.visible === 'false') return;
    pop.dataset.visible = 'false';
    items = [];
  };

  const show = (next: Suggestion[]) => {
    if (next.length === 0) {
      hide();
      return;
    }
    items = next;
    active = 0;
    render();
    position();
  };

  const accept = () => {
    const s = items[active];
    if (!s) return;
    hide();
    onAccept(s);
  };

  const move = (delta: number) => {
    if (items.length === 0) return;
    active = (active + delta + items.length) % items.length;
    render();
  };

  const handleKey = (e: KeyboardEvent): boolean => {
    if (pop.dataset.visible !== 'true') return false;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      accept();
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
      return true;
    }
    return false;
  };

  return {
    show,
    hide,
    isVisible: () => pop.dataset.visible === 'true',
    handleKey,
    destroy: () => {
      pop.remove();
    },
  };
};
