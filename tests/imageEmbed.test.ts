import { describe, expect, it } from 'vitest';
import { insertImageAtCursor, isUnsafeImageMime } from '../src/imageEmbed.ts';

describe('insertImageAtCursor', () => {
  it('inserts at a collapsed cursor position', () => {
    const result = insertImageAtCursor('hello', 3, 3, 'data:png');
    expect(result.value).toBe('hel![](data:png)lo');
    expect(result.cursor).toBe(3 + '![](data:png)'.length);
  });

  it('replaces a selection', () => {
    const result = insertImageAtCursor('hello world', 0, 5, 'data:x');
    expect(result.value).toBe('![](data:x) world');
    expect(result.cursor).toBe('![](data:x)'.length);
  });

  it('places cursor immediately after the inserted snippet', () => {
    const result = insertImageAtCursor('', 0, 0, 'data:empty');
    expect(result.cursor).toBe(result.value.length);
  });

  it('honors a non-empty alt text', () => {
    const result = insertImageAtCursor('', 0, 0, 'data:foo', 'screenshot');
    expect(result.value).toBe('![screenshot](data:foo)');
    expect(result.cursor).toBe(result.value.length);
  });

  it('leaves surrounding content untouched', () => {
    const result = insertImageAtCursor('before END after', 11, 11, 'd');
    expect(result.value).toBe('before END ![](d)after');
  });
});

describe('isUnsafeImageMime', () => {
  it('rejects image/svg+xml', () => {
    expect(isUnsafeImageMime('image/svg+xml')).toBe(true);
  });

  it('rejects the legacy image/svg variant', () => {
    expect(isUnsafeImageMime('image/svg')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isUnsafeImageMime('Image/SVG+XML')).toBe(true);
  });

  it('ignores trailing parameters', () => {
    expect(isUnsafeImageMime('image/svg+xml; charset=utf-8')).toBe(true);
  });

  it('accepts regular raster image types', () => {
    expect(isUnsafeImageMime('image/png')).toBe(false);
    expect(isUnsafeImageMime('image/jpeg')).toBe(false);
    expect(isUnsafeImageMime('image/webp')).toBe(false);
    expect(isUnsafeImageMime('image/gif')).toBe(false);
  });

  it('accepts an empty string', () => {
    expect(isUnsafeImageMime('')).toBe(false);
  });
});
