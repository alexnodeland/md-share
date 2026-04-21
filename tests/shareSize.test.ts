import { describe, expect, it } from 'vitest';
import { DEFAULT_LIMITS, describeShareSize, formatBytes, type Limits } from '../src/shareSize.ts';

const tightLimits: Limits = { amber: 10, red: 20 };

describe('describeShareSize', () => {
  it('reports zero bytes for an empty URL in the green band', () => {
    expect(describeShareSize('')).toEqual({
      band: 'green',
      bytes: 0,
      ratio: 0,
      suggestions: [],
    });
  });

  it('stays green at the exact amber threshold', () => {
    const url = 'x'.repeat(DEFAULT_LIMITS.amber);
    const size = describeShareSize(url);
    expect(size.band).toBe('green');
    expect(size.bytes).toBe(DEFAULT_LIMITS.amber);
    expect(size.suggestions).toEqual([]);
  });

  it('crosses into amber one byte past the amber threshold', () => {
    const url = 'x'.repeat(DEFAULT_LIMITS.amber + 1);
    const size = describeShareSize(url);
    expect(size.band).toBe('amber');
    expect(size.suggestions.map((s) => s.id)).toEqual(['strip-images']);
  });

  it('stays amber at the exact red threshold', () => {
    const url = 'x'.repeat(DEFAULT_LIMITS.red);
    const size = describeShareSize(url);
    expect(size.band).toBe('amber');
  });

  it('crosses into red one byte past the red threshold', () => {
    const url = 'x'.repeat(DEFAULT_LIMITS.red + 1);
    const size = describeShareSize(url);
    expect(size.band).toBe('red');
    expect(size.suggestions.map((s) => s.id)).toEqual(['strip-images', 'download-md']);
  });

  it('caps ratio at 1 when bytes exceed the red threshold', () => {
    const url = 'x'.repeat(DEFAULT_LIMITS.red * 4);
    const size = describeShareSize(url);
    expect(size.ratio).toBe(1);
  });

  it('reports a fractional ratio below the red threshold', () => {
    const url = 'x'.repeat(Math.floor(DEFAULT_LIMITS.red / 2));
    const size = describeShareSize(url);
    expect(size.ratio).toBeCloseTo(0.5, 2);
  });

  it('honors caller-supplied limits over the defaults', () => {
    expect(describeShareSize('12345678901', tightLimits).band).toBe('amber');
    expect(describeShareSize('123456789012345678901', tightLimits).band).toBe('red');
  });

  it('emits suggestion objects with stable ids and human-readable messages', () => {
    const red = describeShareSize('x'.repeat(DEFAULT_LIMITS.red + 1));
    for (const s of red.suggestions) {
      expect(s.id).toMatch(/^[a-z-]+$/);
      expect(s.message.length).toBeGreaterThan(0);
    }
  });
});

describe('formatBytes', () => {
  it('shows raw byte counts under 1 KB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(1023)).toBe('1,023 B');
  });

  it('shows one decimal place for small KB values', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(9 * 1024)).toBe('9.0 KB');
  });

  it('rounds to whole KB at 10 KB and above', () => {
    expect(formatBytes(10 * 1024)).toBe('10 KB');
    expect(formatBytes(12 * 1024)).toBe('12 KB');
    expect(formatBytes(12800)).toBe('13 KB');
    expect(formatBytes(100 * 1024)).toBe('100 KB');
  });
});
