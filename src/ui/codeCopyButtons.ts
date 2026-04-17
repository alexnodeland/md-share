import type { Clipboard } from '../ports.ts';
import { showToast } from './toast.ts';

export interface CodeCopyDeps {
  clipboard: Clipboard;
}

const BUTTON_CLASS = 'copy-code';

export const initCodeCopyButtons = ({ clipboard }: CodeCopyDeps): (() => void) => {
  const preview = document.getElementById('preview');
  if (!preview) return () => {};

  preview.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target?.classList.contains(BUTTON_CLASS)) return;
    const pre = target.closest('pre');
    const code = pre?.querySelector('code');
    const text = code?.textContent ?? '';
    if (!text) return;
    clipboard
      .write(text)
      .then(() => showToast('Code copied', true))
      .catch(() => showToast('Copy failed'));
  });

  const decorate = () => {
    const pres = preview.querySelectorAll('pre:not(.mermaid)');
    for (const pre of pres) {
      if (pre.querySelector(`:scope > .${BUTTON_CLASS}`)) continue;
      if (!pre.querySelector(':scope > code')) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = BUTTON_CLASS;
      btn.setAttribute('aria-label', 'Copy code');
      btn.textContent = 'Copy';
      pre.appendChild(btn);
    }
  };

  return decorate;
};
