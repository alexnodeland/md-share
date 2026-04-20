import { describe, expect, it } from 'vitest';
import { detectPlatform, formatShortcut } from '../src/shortcuts.ts';

describe('detectPlatform', () => {
  it('reports mac for MacIntel', () => {
    expect(detectPlatform('MacIntel')).toBe('mac');
  });

  it('reports mac for iPhone', () => {
    expect(detectPlatform('iPhone')).toBe('mac');
  });

  it('reports mac for iPad', () => {
    expect(detectPlatform('iPad')).toBe('mac');
  });

  it('reports mac for iPod', () => {
    expect(detectPlatform('iPod')).toBe('mac');
  });

  it('reports other for Win32', () => {
    expect(detectPlatform('Win32')).toBe('other');
  });

  it('reports other for Linux', () => {
    expect(detectPlatform('Linux x86_64')).toBe('other');
  });

  it('reports other for an empty string', () => {
    expect(detectPlatform('')).toBe('other');
  });
});

describe('formatShortcut on mac', () => {
  it('renders Mod+letter with no separator', () => {
    expect(formatShortcut('Mod+S', 'mac')).toBe('\u2318S');
  });

  it('uppercases a lowercase letter', () => {
    expect(formatShortcut('Mod+b', 'mac')).toBe('\u2318B');
  });

  it('renders Shift+Mod+letter with stacked glyphs', () => {
    expect(formatShortcut('Shift+Mod+P', 'mac')).toBe('\u21E7\u2318P');
  });

  it('renders Alt+Mod+letter with stacked glyphs', () => {
    expect(formatShortcut('Alt+Mod+P', 'mac')).toBe('\u2325\u2318P');
  });

  it('maps explicit Ctrl to the control glyph', () => {
    expect(formatShortcut('Ctrl+S', 'mac')).toBe('\u2303S');
  });

  it('maps Enter to its return glyph', () => {
    expect(formatShortcut('Mod+Enter', 'mac')).toBe('\u2318\u21A9');
  });

  it('passes through unknown multi-character tokens as-is', () => {
    expect(formatShortcut('Mod+Tab', 'mac')).toBe('\u2318Tab');
  });

  it('handles a bare single letter', () => {
    expect(formatShortcut('k', 'mac')).toBe('K');
  });

  it('tolerates whitespace around tokens', () => {
    expect(formatShortcut(' Mod + S ', 'mac')).toBe('\u2318S');
  });
});

describe('formatShortcut on other', () => {
  it('renders Mod+letter as Ctrl+Letter', () => {
    expect(formatShortcut('Mod+S', 'other')).toBe('Ctrl+S');
  });

  it('uppercases a lowercase letter', () => {
    expect(formatShortcut('Mod+b', 'other')).toBe('Ctrl+B');
  });

  it('preserves Shift/Alt names', () => {
    expect(formatShortcut('Mod+Shift+P', 'other')).toBe('Ctrl+Shift+P');
    expect(formatShortcut('Mod+Alt+Enter', 'other')).toBe('Ctrl+Alt+Enter');
  });

  it('passes through an explicit Ctrl token', () => {
    expect(formatShortcut('Ctrl+H', 'other')).toBe('Ctrl+H');
  });

  it('handles a bare single letter', () => {
    expect(formatShortcut('k', 'other')).toBe('K');
  });

  it('passes through multi-character tokens as-is', () => {
    expect(formatShortcut('Mod+Tab', 'other')).toBe('Ctrl+Tab');
  });
});
