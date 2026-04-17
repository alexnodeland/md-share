import { describe, expect, it } from 'vitest';
import { computeScrollTarget } from '../src/scrollSync.ts';

describe('computeScrollTarget', () => {
  it('maps a 50% source scroll to 50% of the target range', () => {
    const target = computeScrollTarget(
      { scrollTop: 100, scrollHeight: 300, clientHeight: 100 },
      { scrollHeight: 500, clientHeight: 100 },
    );
    expect(target).toBe(200);
  });

  it('returns 0 when the source has nothing to scroll', () => {
    const target = computeScrollTarget(
      { scrollTop: 0, scrollHeight: 100, clientHeight: 100 },
      { scrollHeight: 500, clientHeight: 100 },
    );
    expect(target).toBe(0);
  });

  it('returns 0 when the target has nothing to scroll', () => {
    const target = computeScrollTarget(
      { scrollTop: 50, scrollHeight: 300, clientHeight: 100 },
      { scrollHeight: 100, clientHeight: 100 },
    );
    expect(target).toBe(0);
  });

  it('clamps a source scrollTop above the range to the target bottom', () => {
    const target = computeScrollTarget(
      { scrollTop: 999, scrollHeight: 300, clientHeight: 100 },
      { scrollHeight: 500, clientHeight: 100 },
    );
    expect(target).toBe(400);
  });

  it('clamps a negative source scrollTop to the target top', () => {
    const target = computeScrollTarget(
      { scrollTop: -50, scrollHeight: 300, clientHeight: 100 },
      { scrollHeight: 500, clientHeight: 100 },
    );
    expect(target).toBe(0);
  });
});
