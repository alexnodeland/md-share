export interface ClearButtonDeps {
  onClear: () => void;
}

export const initClearButton = ({ onClear }: ClearButtonDeps): void => {
  const btn = document.getElementById('btn-clear') as HTMLButtonElement | null;
  if (!btn) return;
  btn.addEventListener('click', onClear);
};
