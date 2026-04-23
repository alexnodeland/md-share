import { focusSlice } from '../outline.ts';

export interface OutlineModeDeps {
  getSource: () => string;
  getCurrentHeadingId: () => string | null;
  onChange: (focusedSource: string | null) => void;
}

export interface OutlineModeControl {
  toggle: () => void;
  clear: () => void;
  isActive: () => boolean;
}

export const initOutlineMode = ({
  getSource,
  getCurrentHeadingId,
  onChange,
}: OutlineModeDeps): OutlineModeControl => {
  let activeId: string | null = null;

  const apply = (): void => {
    if (activeId === null) {
      onChange(null);
      return;
    }
    const slice = focusSlice(getSource(), activeId);
    onChange(slice);
  };

  const toggle = (): void => {
    if (activeId !== null) {
      activeId = null;
      apply();
      return;
    }
    const id = getCurrentHeadingId();
    if (!id) return;
    activeId = id;
    apply();
  };

  const clear = (): void => {
    if (activeId === null) return;
    activeId = null;
    apply();
  };

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '.') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'Escape' && activeId !== null) {
      clear();
    }
  });

  return {
    toggle,
    clear,
    isActive: () => activeId !== null,
  };
};
