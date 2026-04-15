export const initEditorToggle = (): void => {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !e.shiftKey) {
      e.preventDefault();
      const pane = document.getElementById('editor-pane');
      if (pane) pane.style.display = pane.style.display === 'none' ? '' : 'none';
    }
  });
};
