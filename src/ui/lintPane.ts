import type { Diagnostic } from '../lint.ts';

export interface LintPaneHandle {
  update(diagnostics: Diagnostic[]): void;
}

export const initLintPane = (): LintPaneHandle => {
  const toggle = document.getElementById('lint-toggle') as HTMLButtonElement | null;
  const badge = document.getElementById('lint-badge');
  const panel = document.getElementById('lint-panel');
  const list = document.getElementById('lint-list');
  if (!toggle || !badge || !panel || !list) {
    return { update: () => {} };
  }

  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', panel.classList.contains('open') ? 'true' : 'false');
  });

  const scrollToPreviewAnchor = (id: string): void => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const jumpToSource = (range: { start: number; end: number }): void => {
    const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
    if (!editor) return;
    editor.focus();
    editor.setSelectionRange(range.start, range.end);
    // Selection scroll-into-view isn't guaranteed — nudge scrollTop to the line.
    const before = editor.value.slice(0, range.start);
    const lineIndex = before.split('\n').length - 1;
    const lineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || 20;
    const pad = editor.clientHeight / 4;
    const targetTop = lineIndex * lineHeight - pad;
    if (targetTop < editor.scrollTop || targetTop > editor.scrollTop + editor.clientHeight - pad) {
      editor.scrollTop = Math.max(0, targetTop);
    }
  };

  return {
    update(diagnostics) {
      const count = diagnostics.length;
      panel.hidden = false;
      list.innerHTML = '';
      if (count === 0) {
        toggle.classList.remove('has-issues');
        badge.textContent = '';
        badge.hidden = true;
        const empty = document.createElement('li');
        empty.className = 'lint-empty';
        empty.textContent = 'No issues found';
        list.append(empty);
        return;
      }
      toggle.classList.add('has-issues');
      badge.hidden = false;
      badge.textContent = String(count);
      for (const d of diagnostics) {
        const li = document.createElement('li');
        li.className = `lint-item lint-${d.severity}`;
        li.dataset.rule = d.id;
        const label = document.createElement('span');
        label.className = 'lint-msg';
        label.textContent = d.message;
        li.append(label);
        // sourceRange jumps the editor; targetId scrolls the preview to a
        // rendered element. A diagnostic that carries neither gets no button.
        if (d.sourceRange) {
          const jump = document.createElement('button');
          jump.type = 'button';
          jump.className = 'lint-jump';
          jump.textContent = 'Jump';
          const range = d.sourceRange;
          jump.addEventListener('click', () => jumpToSource(range));
          li.append(jump);
        } else if (d.targetId) {
          const jump = document.createElement('button');
          jump.type = 'button';
          jump.className = 'lint-jump';
          jump.textContent = 'Jump';
          const target = d.targetId;
          jump.addEventListener('click', () => scrollToPreviewAnchor(target));
          li.append(jump);
        }
        list.append(li);
      }
    },
  };
};
