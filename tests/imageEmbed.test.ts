import { describe, expect, it } from 'vitest';
import { insertImageAtCursor, stripEmbeddedImages } from '../src/imageEmbed.ts';

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

describe('stripEmbeddedImages', () => {
  it('replaces embedded images with their alt text and counts them', () => {
    expect(
      stripEmbeddedImages(
        'A ![Chart](data:image/webp;base64,AAAA) b ![](data:image/png;base64,BB "t") <img alt="x" src="data:image/png;base64,CC">',
      ),
    ).toEqual({ text: 'A *[Image: Chart]* b *[Image]* *[Image]*', count: 3 });
  });

  it('keeps linked images and plain text untouched', () => {
    const doc = '![Logo](https://x.org/logo.png) <img src="/a.png"> data:text';
    expect(stripEmbeddedImages(doc)).toEqual({ text: doc, count: 0 });
  });
});
