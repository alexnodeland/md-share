export interface EditorToggleDeps {
  button: HTMLButtonElement;
}

export const initEditorToggle = ({ button }: EditorToggleDeps): void => {
  const pane = document.getElementById('editor-pane');
  if (!pane) return;

  const setPressed = (pressed: boolean) => {
    button.setAttribute('aria-pressed', String(pressed));
  };

  const toggle = () => {
    const nextHidden = pane.style.display !== 'none';
    pane.style.display = nextHidden ? 'none' : '';
    setPressed(!nextHidden);
  };

  setPressed(pane.style.display !== 'none');
  button.addEventListener('click', toggle);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !e.shiftKey) {
      e.preventDefault();
      toggle();
    }
  });
};
