import { describe, expect, it } from 'vitest';
import { inPageTargetId } from '../src/inPageLink.ts';

describe('inPageTargetId', () => {
  it('returns the id for fragment-only links', () => {
    expect(inPageTargetId('#intro')).toBe('intro');
    expect(inPageTargetId('#fn1')).toBe('fn1');
  });

  it('decodes percent-encoded ids', () => {
    expect(inPageTargetId('#caf%C3%A9')).toBe('café');
  });

  it('keeps malformed escapes verbatim', () => {
    expect(inPageTargetId('#%FF')).toBe('%FF');
  });

  it('ignores external, relative, bare-hash, and missing hrefs', () => {
    expect(inPageTargetId('https://example.com/#x')).toBeNull();
    expect(inPageTargetId('page.html#x')).toBeNull();
    expect(inPageTargetId('#')).toBeNull();
    expect(inPageTargetId(null)).toBeNull();
  });
});
