import { countStats, formatStats } from '../stats.ts';

export interface StatsDeps {
  getSource: () => string;
}

export const initStats = ({ getSource }: StatsDeps): (() => void) => {
  const el = document.getElementById('editor-stats');
  if (!el) return () => {};
  const update = () => {
    el.textContent = formatStats(countStats(getSource()));
  };
  update();
  return update;
};
