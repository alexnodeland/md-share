import { describe, expect, it } from 'vitest';
import {
  isSampleContent,
  isSampleKey,
  SAMPLE_FLAVOR,
  SAMPLE_LABELS,
  SAMPLES,
  type SampleKey,
  sampleFor,
} from '../src/samples.ts';
import { FLAVOR_NAMES } from '../src/types.ts';

const SAMPLE_KEYS = Object.keys(SAMPLES) as SampleKey[];

describe('SAMPLES', () => {
  it.each(SAMPLE_KEYS)('has a non-empty sample for key=%s', (key) => {
    expect(SAMPLES[key].length).toBeGreaterThan(0);
  });

  it('all samples are distinct', () => {
    const trimmed = SAMPLE_KEYS.map((k) => SAMPLES[k].trim());
    expect(new Set(trimmed).size).toBe(SAMPLE_KEYS.length);
  });
});

describe('SAMPLE_LABELS', () => {
  it.each(SAMPLE_KEYS)('has a label for key=%s', (key) => {
    expect(SAMPLE_LABELS[key]).toBeTruthy();
  });
});

describe('SAMPLE_FLAVOR', () => {
  it.each(FLAVOR_NAMES)('maps flavor sample %s to the same flavor', (flavor) => {
    expect(SAMPLE_FLAVOR[flavor]).toBe(flavor);
  });

  it('maps the presentation sample to a known flavor', () => {
    expect(FLAVOR_NAMES).toContain(SAMPLE_FLAVOR.presentation);
  });
});

describe('isSampleKey', () => {
  it.each(SAMPLE_KEYS)('accepts known key=%s', (key) => {
    expect(isSampleKey(key)).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(isSampleKey('nope')).toBe(false);
    expect(isSampleKey('')).toBe(false);
  });
});

describe('sampleFor', () => {
  it.each(SAMPLE_KEYS)('returns the correct sample for key=%s', (key) => {
    expect(sampleFor(key)).toBe(SAMPLES[key]);
  });
});

describe('isSampleContent', () => {
  it.each(SAMPLE_KEYS)('identifies the %s sample', (key) => {
    expect(isSampleContent(SAMPLES[key])).toBe(key);
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
