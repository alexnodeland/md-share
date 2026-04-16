type View = 'edit' | 'preview';

export interface MobileToggleOptions {
  onShowPreview?: () => void;
}

export const initMobileToggle = (opts: MobileToggleOptions = {}): void => {
  const btnEdit = document.getElementById('btn-edit-view');
  const btnPreview = document.getElementById('btn-preview-view');
  const editorPane = document.getElementById('editor-pane');
  const previewPane = document.getElementById('preview-pane');
  if (!btnEdit || !btnPreview || !editorPane || !previewPane) return;

  const setView = (v: View) => {
    editorPane.classList.toggle('mobile-visible', v === 'edit');
    previewPane.classList.toggle('mobile-visible', v === 'preview');
    btnEdit.classList.toggle('active', v === 'edit');
    btnPreview.classList.toggle('active', v === 'preview');
    if (v === 'preview') opts.onShowPreview?.();
  };

  btnEdit.addEventListener('click', () => setView('edit'));
  btnPreview.addEventListener('click', () => setView('preview'));
};
