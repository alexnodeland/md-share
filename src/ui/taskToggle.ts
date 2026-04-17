export interface TaskToggleDeps {
  onToggle: (line: number) => void;
}

export const initTaskToggle = ({ onToggle }: TaskToggleDeps): void => {
  const preview = document.getElementById('preview');
  if (!preview) return;

  preview.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== 'checkbox') return;
    const raw = target.dataset.taskLine;
    if (raw === undefined) return;
    const line = Number(raw);
    if (!Number.isInteger(line) || line < 0) return;
    e.preventDefault();
    onToggle(line);
  });
};
