import { DEFAULTS, defaultFor } from '../defaults.ts';
import { FLAVOR_LABELS } from '../flavors.ts';
import { type Flavor, isFlavor } from '../types.ts';
import { showToast } from './toast.ts';

export interface FlavorSelectDeps {
  getCurrentFlavor: () => Flavor;
  onChange: (flavor: Flavor) => void;
}

export const initFlavorSelect = ({ getCurrentFlavor, onChange }: FlavorSelectDeps): void => {
  const select = document.getElementById('flavor-select') as HTMLSelectElement | null;
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  if (!select || !editor) return;

  select.addEventListener('change', () => {
    const prev = getCurrentFlavor();
    const prevDefault = DEFAULTS[prev] ?? DEFAULTS._base;
    const isShowingDefault = editor.value.trim() === prevDefault.trim();

    const next = select.value;
    if (!isFlavor(next)) return;

    if (isShowingDefault) {
      editor.value = defaultFor(next);
    }
    onChange(next);
    showToast(`Flavor: ${FLAVOR_LABELS[next]}`);
  });
};

export const setFlavorSelectValue = (flavor: Flavor): void => {
  const select = document.getElementById('flavor-select') as HTMLSelectElement | null;
  if (select) select.value = flavor;
};
