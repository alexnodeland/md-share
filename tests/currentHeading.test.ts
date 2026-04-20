import { describe, expect, it } from 'vitest';
import { getCurrentHeading, type HeadingPosition } from '../src/currentHeading.ts';

const headings: HeadingPosition[] = [
  { id: 'intro', top: 0 },
  { id: 'middle', top: 500 },
  { id: 'end', top: 1200 },
];

describe('getCurrentHeading', () => {
  it('returns null when there are no headings', () => {
    expect(getCurrentHeading([], 0)).toBeNull();
  });

  it('returns null when scrollTop has not yet reached the first heading', () => {
    expect(getCurrentHeading([{ id: 'a', top: 100 }], 0)).toBeNull();
  });

  it('returns the first heading at exactly its top', () => {
    expect(getCurrentHeading(headings, 0)).toBe('intro');
  });

  it('returns the most recently passed heading when scrolled into a section', () => {
    expect(getCurrentHeading(headings, 600)).toBe('middle');
  });

  it('returns the last heading once scroll passes all of them', () => {
    expect(getCurrentHeading(headings, 9999)).toBe('end');
  });

  it('respects the offset for early activation', () => {
    // With offset=50, scrollTop=450 is treated as 500 → middle activates
    expect(getCurrentHeading(headings, 450, 50)).toBe('middle');
  });

  it('still returns the heading at exact top when offset is zero (default)', () => {
    expect(getCurrentHeading(headings, 500)).toBe('middle');
  });
});
