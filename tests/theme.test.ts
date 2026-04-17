import { describe, expect, it } from 'vitest';
import {
  isTheme,
  mermaidThemeName,
  mermaidThemeVars,
  resolveInitialTheme,
  toggleTheme,
} from '../src/theme.ts';

describe('isTheme', () => {
  it('recognises "dark" and "light"', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isTheme('bluebird')).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isTheme(42)).toBe(false);
  });
});

describe('toggleTheme', () => {
  it('dark -> light', () => {
    expect(toggleTheme('dark')).toBe('light');
  });

  it('light -> dark', () => {
    expect(toggleTheme('light')).toBe('dark');
  });
});

describe('mermaidThemeVars', () => {
  it('returns the full dark theme variables', () => {
    const vars = mermaidThemeVars('dark');
    expect(vars.primaryColor).toBe('#7c3aed');
    expect(vars.background).toBe('#101012');
  });

  it('returns a minimal light theme variables set', () => {
    const vars = mermaidThemeVars('light');
    expect(vars.primaryColor).toBe('#7c3aed');
    expect(vars.primaryTextColor).toBe('#1a1a2e');
    expect(vars.background).toBeUndefined();
  });
});

describe('mermaidThemeName', () => {
  it('maps dark -> dark and light -> default (mermaid uses "default" for light)', () => {
    expect(mermaidThemeName('dark')).toBe('dark');
    expect(mermaidThemeName('light')).toBe('default');
  });
});

describe('resolveInitialTheme', () => {
  it('uses a valid stored value', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark');
    expect(resolveInitialTheme('light', true)).toBe('light');
  });

  it('falls back to OS preference when nothing is stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme(null, false)).toBe('light');
  });

  it('ignores invalid stored values', () => {
    expect(resolveInitialTheme('bluebird', true)).toBe('dark');
    expect(resolveInitialTheme('', false)).toBe('light');
  });
});
