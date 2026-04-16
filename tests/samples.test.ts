import { describe, expect, it } from 'vitest';
import { isSampleContent, SAMPLE_LABELS, SAMPLES, sampleFor } from '../src/samples.ts';
import { FLAVOR_NAMES } from '../src/types.ts';

describe('SAMPLES', () => {
  it.each(FLAVOR_NAMES)('has a non-empty sample for flavor=%s', (flavor) => {
    expect(SAMPLES[flavor].length).toBeGreaterThan(0);
  });

  it('all 6 samples are distinct', () => {
    const trimmed = FLAVOR_NAMES.map((f) => SAMPLES[f].trim());
    expect(new Set(trimmed).size).toBe(FLAVOR_NAMES.length);
  });
});

describe('SAMPLE_LABELS', () => {
  it.each(FLAVOR_NAMES)('has a label for flavor=%s', (flavor) => {
    expect(SAMPLE_LABELS[flavor]).toBeTruthy();
  });
});

describe('sampleFor', () => {
  it.each(FLAVOR_NAMES)('returns the correct sample for key=%s', (key) => {
    expect(sampleFor(key)).toBe(SAMPLES[key]);
  });
});

describe('isSampleContent', () => {
  it.each(FLAVOR_NAMES)('identifies the %s sample', (flavor) => {
    expect(isSampleContent(SAMPLES[flavor])).toBe(flavor);
  });

  it('returns null for custom content', () => {
    expect(isSampleContent('# My custom doc\n\nHello world')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(isSampleContent('')).toBeNull();
  });

  it('matches with extra surrounding whitespace', () => {
    expect(isSampleContent(`  \n${SAMPLES.gfm}\n  `)).toBe('gfm');
  });
});
