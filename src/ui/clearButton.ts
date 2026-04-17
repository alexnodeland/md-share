export interface ClearButtonDeps {
  onClear: () => void;
  confirm?: (message: string) => boolean;
}

export const initClearButton = ({
  onClear,
  confirm = (message) => window.confirm(message),
}: ClearButtonDeps): void => {
  const btn = document.getElementById('btn-clear') as HTMLButtonElement | null;
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (
      editor &&
      editor.value.length > 0 &&
      !confirm('Clear this document? This cannot be undone.')
    )
      return;
    onClear();
  });
};
