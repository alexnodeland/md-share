import { isSampleKey, SAMPLE_LABELS, type SampleKey } from '../samples.ts';
import { showToast } from './toast.ts';

export interface SampleSelectDeps {
  onSelect: (key: SampleKey) => void;
}

export const initSampleSelect = ({ onSelect }: SampleSelectDeps): void => {
  const select = document.getElementById('sample-select') as HTMLSelectElement | null;
  if (!select) return;

  select.addEventListener('change', () => {
    const key = select.value;
    if (!isSampleKey(key)) return;
    onSelect(key);
    showToast(`Sample: ${SAMPLE_LABELS[key]}`);
  });
};

export const setSampleSelectValue = (key: SampleKey | null): void => {
  const select = document.getElementById('sample-select') as HTMLSelectElement | null;
  if (select) select.value = key ?? '';
};
