// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('link dictionary v1', () => {
  it('never changes: every dd1. link ever shared decodes against these exact bytes', () => {
    const bytes = readFileSync(new URL('../../src/assets/link-dictionary-v1.txt', import.meta.url));
    expect(bytes.length).toBe(31_947);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      'ad1eecb3d9ae81339460c896f9d31aa9b25a4267dea4c8616e225dcaefa55a5d',
    );
  });
});
