import { describe, expect, it } from 'vitest';
import { resolveInitialFlavor } from '../src/flavor.ts';

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
