import { isTheme, toggleTheme } from '../theme.ts';
import type { Theme } from '../types.ts';

export interface ThemeDeps {
  onChange: (theme: Theme) => void;
}

const currentTheme = (): Theme => {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : 'dark';
};

const applyTheme = (theme: Theme): void => {
  const html = document.documentElement;
  html.classList.add('theme-switching');
  html.dataset.theme = theme;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      html.classList.remove('theme-switching');
    });
  });
  const moon = document.getElementById('icon-moon');
  const sun = document.getElementById('icon-sun');
  if (moon) moon.style.display = theme === 'dark' ? '' : 'none';
  if (sun) sun.style.display = theme === 'light' ? '' : 'none';
};

export const initThemeToggle = ({ onChange }: ThemeDeps): void => {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  applyTheme(currentTheme());
  btn.addEventListener('click', () => {
    const next = toggleTheme(currentTheme());
    applyTheme(next);
    onChange(next);
  });
};
