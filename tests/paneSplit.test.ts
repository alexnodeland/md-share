import { describe, expect, it } from 'vitest';
import {
  clampSplitRatio,
  computeSplitRatio,
  DEFAULT_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  nudgeRatio,
  parseStoredRatio,
} from '../src/paneSplit.ts';

describe('clampSplitRatio', () => {
  it('passes a mid-range ratio through unchanged', () => {
    expect(clampSplitRatio(0.5)).toBe(0.5);
  });

  it('clamps values below MIN_SPLIT_RATIO up', () => {
    expect(clampSplitRatio(0)).toBe(MIN_SPLIT_RATIO);
    expect(clampSplitRatio(-5)).toBe(MIN_SPLIT_RATIO);
  });

  it('clamps values above MAX_SPLIT_RATIO down', () => {
    expect(clampSplitRatio(1)).toBe(MAX_SPLIT_RATIO);
    expect(clampSplitRatio(10)).toBe(MAX_SPLIT_RATIO);
  });
});

describe('computeSplitRatio', () => {
  it('computes a clamped ratio from pointer x within the container', () => {
    expect(computeSplitRatio(500, 0, 1000)).toBe(0.5);
  });

  it('clamps a pointer far to the right of the container', () => {
    expect(computeSplitRatio(9999, 0, 1000)).toBe(MAX_SPLIT_RATIO);
  });

  it('clamps a pointer far to the left of the container', () => {
    expect(computeSplitRatio(-100, 0, 1000)).toBe(MIN_SPLIT_RATIO);
  });

  it('accounts for a non-zero container left offset', () => {
    expect(computeSplitRatio(700, 200, 1000)).toBe(0.5);
  });

  it('returns the default ratio when the container has no width', () => {
    expect(computeSplitRatio(500, 0, 0)).toBe(DEFAULT_SPLIT_RATIO);
    expect(computeSplitRatio(500, 0, -10)).toBe(DEFAULT_SPLIT_RATIO);
  });
});

describe('parseStoredRatio', () => {
  it('returns null for a missing value', () => {
    expect(parseStoredRatio(null)).toBeNull();
  });

  it('returns null for a non-numeric string', () => {
    expect(parseStoredRatio('not-a-number')).toBeNull();
  });

  it('returns a clamped ratio for a finite numeric string', () => {
    expect(parseStoredRatio('0.7')).toBe(0.7);
    expect(parseStoredRatio('0.01')).toBe(MIN_SPLIT_RATIO);
    expect(parseStoredRatio('0.99')).toBe(MAX_SPLIT_RATIO);
  });
});

describe('nudgeRatio', () => {
  it('shifts the current ratio by the delta', () => {
    expect(nudgeRatio(0.5, 0.1)).toBeCloseTo(0.6);
    expect(nudgeRatio(0.5, -0.1)).toBeCloseTo(0.4);
  });

  it('clamps the result within bounds', () => {
    expect(nudgeRatio(MAX_SPLIT_RATIO, 0.5)).toBe(MAX_SPLIT_RATIO);
    expect(nudgeRatio(MIN_SPLIT_RATIO, -0.5)).toBe(MIN_SPLIT_RATIO);
  });
});
