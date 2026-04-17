import { describe, expect, it } from 'vitest';
import {
  continueIndent,
  continueList,
  isUrl,
  toggleWrap,
  wrapLink,
} from '../src/editorCommands.ts';

describe('toggleWrap', () => {
  it('wraps the selection with the marker when not already wrapped', () => {
    const r = toggleWrap('hello world', 0, 5, '**');
    expect(r.value).toBe('**hello** world');
    expect(r.start).toBe(2);
    expect(r.end).toBe(7);
  });

  it('unwraps when the selection itself starts and ends with the marker', () => {
    const r = toggleWrap('**hello** world', 0, 9, '**');
    expect(r.value).toBe('hello world');
    expect(r.start).toBe(0);
    expect(r.end).toBe(5);
  });

  it('unwraps when the selection sits between the markers', () => {
    const r = toggleWrap('**hello** world', 2, 7, '**');
    expect(r.value).toBe('hello world');
    expect(r.start).toBe(0);
    expect(r.end).toBe(5);
  });

  it('wraps an empty selection, placing the cursor between markers', () => {
    const r = toggleWrap('abc', 3, 3, '*');
    expect(r.value).toBe('abc**');
    expect(r.start).toBe(4);
    expect(r.end).toBe(4);
  });
});

describe('wrapLink', () => {
  it('wraps a selection with a URL placeholder when no URL is given', () => {
    const r = wrapLink('click me', 0, 5, '');
    expect(r.value).toBe('[click](url) me');
    expect(r.start).toBe(8);
    expect(r.end).toBe(11);
  });

  it('wraps a selection with the provided URL and collapses the cursor to the end', () => {
    const r = wrapLink('see docs', 4, 8, 'https://example.com');
    expect(r.value).toBe('see [docs](https://example.com)');
    expect(r.start).toBe(r.value.length);
    expect(r.end).toBe(r.value.length);
  });

  it('inserts a placeholder template when nothing is selected', () => {
    const r = wrapLink('', 0, 0, '');
    expect(r.value).toBe('[text](url)');
    expect(r.start).toBe(1);
    expect(r.end).toBe(5);
  });
});

describe('continueList', () => {
  it('continues an unordered list with the same bullet', () => {
    const source = '- first';
    const r = continueList(source, source.length);
    expect(r).toEqual({ value: '- first\n- ', cursor: 10 });
  });

  it('increments an ordered list marker', () => {
    const source = '  1. one';
    const r = continueList(source, source.length);
    expect(r).toEqual({ value: '  1. one\n  2. ', cursor: 14 });
  });

  it('continues a task list with an empty checkbox', () => {
    const source = '- [x] done';
    const r = continueList(source, source.length);
    expect(r).toEqual({ value: '- [x] done\n- [ ] ', cursor: 17 });
  });

  it('removes an empty marker line instead of continuing', () => {
    const source = '- first\n- ';
    const r = continueList(source, source.length);
    expect(r).toEqual({ value: '- first\n', cursor: 8 });
  });

  it('returns null when the line is not a list item', () => {
    expect(continueList('plain paragraph', 15)).toBeNull();
  });

  it('returns null when the cursor is mid-line', () => {
    expect(continueList('- item', 3)).toBeNull();
  });
});

describe('continueIndent', () => {
  it('carries leading spaces onto the next line', () => {
    const source = '    const x = 1;';
    const r = continueIndent(source, source.length);
    expect(r).toEqual({ value: '    const x = 1;\n    ', cursor: 21 });
  });

  it('carries a leading tab onto the next line', () => {
    const source = '\t\tnote';
    const r = continueIndent(source, source.length);
    expect(r).toEqual({ value: '\t\tnote\n\t\t', cursor: 9 });
  });

  it('returns null when the line has no leading whitespace', () => {
    expect(continueIndent('plain text', 10)).toBeNull();
  });

  it('returns null when the line is only whitespace', () => {
    expect(continueIndent('    ', 4)).toBeNull();
  });

  it('returns null when the cursor is mid-line', () => {
    expect(continueIndent('    word', 2)).toBeNull();
  });
});

describe('isUrl', () => {
  it('recognises http(s) URLs', () => {
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('http://foo.bar/baz')).toBe(true);
    expect(isUrl('  https://trim.me  ')).toBe(true);
  });

  it('rejects non-URLs and other schemes', () => {
    expect(isUrl('example.com')).toBe(false);
    expect(isUrl('mailto:x@y.z')).toBe(false);
    expect(isUrl('https://has spaces/bad')).toBe(false);
    expect(isUrl('')).toBe(false);
  });
});
