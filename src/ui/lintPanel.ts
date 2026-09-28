import { type Diagnostic, describeDiagnostics } from '../lint.ts';

export interface LintPanelDeps {
  /** Move the editor to a 1-based source line. */
  onJump: (line: number) => void;
}

const renderItem = (d: Diagnostic): HTMLButtonElement => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('role', 'menuitem');
  btn.className = 'lint-item';
  btn.dataset.line = String(d.line);
  const where = document.createElement('span');
  where.className = 'lint-line';
  where.textContent = `Line ${d.line}`;
  const what = document.createElement('span');
  what.className = 'lint-message';
  what.textContent = d.message;
  btn.append(where, what);
  return btn;
};

/** The "N issues" badge in the preview header. Returns the updater renders call. */
export const initLintPanel = ({ onJump }: LintPanelDeps): ((diagnostics: Diagnostic[]) => void) => {
  const badge = document.getElementById('btn-lint');
  const label = document.getElementById('lint-count');
  const menu = document.getElementById('lint-menu');
  if (!badge || !label || !menu) return () => {};

  menu.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-line]');
    if (item) onJump(Number(item.dataset.line));
  });

  return (diagnostics) => {
    badge.hidden = diagnostics.length === 0;
    label.textContent = describeDiagnostics(diagnostics.length);
    badge.setAttribute('aria-label', `Document check: ${describeDiagnostics(diagnostics.length)}`);
    menu.replaceChildren(...diagnostics.map(renderItem));
  };
};
