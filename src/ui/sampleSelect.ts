import { SAMPLE_LABELS } from '../samples.ts';
import { type Flavor, isFlavor } from '../types.ts';
import { showToast } from './toast.ts';

export interface SampleSelectDeps {
  onSelect: (key: Flavor) => void;
}

export const initSampleSelect = ({ onSelect }: SampleSelectDeps): void => {
  const select = document.getElementById('sample-select') as HTMLSelectElement | null;
  if (!select) return;

  select.addEventListener('change', () => {
    const key = select.value;
    if (!isFlavor(key)) return;
    onSelect(key);
    showToast(`Sample: ${SAMPLE_LABELS[key]}`);
  });
};

export const setSampleSelectValue = (key: Flavor | null): void => {
  const select = document.getElementById('sample-select') as HTMLSelectElement | null;
  if (select) select.value = key ?? '';
};
