import { describe, expect, it } from 'vitest';
import { flavorNeedsKatex, resolveInitialFlavor } from '../src/flavor.ts';

describe('resolveInitialFlavor', () => {
  it('prefers the shared flavor', () => {
    expect(resolveInitialFlavor('obsidian', 'atlassian')).toBe('obsidian');
  });

  it('falls back to a valid stored flavor when nothing is shared', () => {
    expect(resolveInitialFlavor(null, 'atlassian')).toBe('atlassian');
  });

  it('ignores invalid stored values', () => {
    expect(resolveInitialFlavor(null, 'notavalidflavor')).toBe('commonmark');
    expect(resolveInitialFlavor(null, null)).toBe('commonmark');
  });
});

describe('flavorNeedsKatex', () => {
  it('is true for academic and obsidian', () => {
    expect(flavorNeedsKatex('academic')).toBe(true);
    expect(flavorNeedsKatex('obsidian')).toBe(true);
  });

  it('is false for the other flavors', () => {
    expect(flavorNeedsKatex('commonmark')).toBe(false);
    expect(flavorNeedsKatex('extended')).toBe(false);
    expect(flavorNeedsKatex('gfm')).toBe(false);
    expect(flavorNeedsKatex('atlassian')).toBe(false);
  });
});
