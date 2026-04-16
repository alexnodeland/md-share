import { FLAVOR_LABELS } from '../flavors.ts';
import { isFlavor } from '../types.ts';
import { showToast } from './toast.ts';

export interface FlavorSelectDeps {
  onChange: (flavor: import('../types.ts').Flavor) => void;
}

export const initFlavorSelect = ({ onChange }: FlavorSelectDeps): void => {
  const select = document.getElementById('flavor-select') as HTMLSelectElement | null;
  if (!select) return;

  select.addEventListener('change', () => {
    const next = select.value;
    if (!isFlavor(next)) return;
    onChange(next);
    showToast(`Flavor: ${FLAVOR_LABELS[next]}`);
  });
};

export const setFlavorSelectValue = (flavor: import('../types.ts').Flavor): void => {
  const select = document.getElementById('flavor-select') as HTMLSelectElement | null;
  if (select) select.value = flavor;
};
