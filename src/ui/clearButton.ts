export interface ClearButtonDeps {
  onClear: () => void;
}

export const initClearButton = ({ onClear }: ClearButtonDeps): void => {
  document.getElementById('btn-clear')?.addEventListener('click', onClear);
};
