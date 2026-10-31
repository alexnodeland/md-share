export interface EditorToggleDeps {
  button: HTMLButtonElement;
  /** Start with the preview alone, e.g. for someone opening a shared link. */
  initiallyHidden?: boolean;
}

export interface EditorToggle {
  show: () => void;
}

export const initEditorToggle = ({
  button,
  initiallyHidden = false,
}: EditorToggleDeps): EditorToggle => {
  const pane = document.getElementById('editor-pane');
  if (!pane) return { show: () => {} };

  const setHidden = (hidden: boolean) => {
    pane.style.display = hidden ? 'none' : '';
    button.setAttribute('aria-pressed', String(!hidden));
  };

  const toggle = () => setHidden(pane.style.display !== 'none');

  setHidden(initiallyHidden);
  button.addEventListener('click', toggle);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !e.shiftKey) {
      e.preventDefault();
      toggle();
    }
  });

  return { show: () => setHidden(false) };
};
