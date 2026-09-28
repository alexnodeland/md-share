import { describe, expect, it } from 'vitest';
import {
  continueIndent,
  continueList,
  indentLines,
  isUrl,
  lineBounds,
  outdentLines,
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

describe('indentLines', () => {
  it('indents every line the selection touches, keeping the text', () => {
    const v = 'a\nbb\nc';
    const r = indentLines(v, 0, 4); // "a\nbb"
    expect(r.value).toBe('  a\n  bb\nc');
    expect(r).toMatchObject({ start: 2, end: 8 });
  });

  it('indents the whole line for a partial one-line selection', () => {
    expect(indentLines('hello world', 6, 11)).toEqual({
      value: '  hello world',
      start: 8,
      end: 13,
    });
  });

  it('does not pull in the line after a trailing newline', () => {
    expect(indentLines('a\nb\n', 0, 2).value).toBe('  a\nb\n');
  });
});

describe('outdentLines', () => {
  it('removes up to two spaces or one tab per line', () => {
    const r = outdentLines('    a\n b\n\tc\nd', 0, 13);
    expect(r.value).toBe('  a\nb\nc\nd');
    expect(r).toMatchObject({ start: 0, end: 9 });
  });

  it('keeps the cursor on its line when it sits inside the indent', () => {
    expect(outdentLines('  a', 1, 1)).toEqual({ value: 'a', start: 0, end: 0 });
  });

  it('shifts a selection left by what was removed', () => {
    expect(outdentLines('x\n  abc', 5, 7)).toEqual({ value: 'x\nabc', start: 3, end: 5 });
  });

  it('is a no-op on unindented lines', () => {
    expect(outdentLines('abc', 1, 2)).toEqual({ value: 'abc', start: 1, end: 2 });
  });
});

describe('lineBounds', () => {
  const doc = 'one\ntwo\nthree';
  it('spans the requested 1-based line', () => {
    expect(lineBounds(doc, 1)).toEqual({ start: 0, end: 3 });
    expect(lineBounds(doc, 2)).toEqual({ start: 4, end: 7 });
    expect(lineBounds(doc, 3)).toEqual({ start: 8, end: 13 });
  });

  it('clamps past-the-end lines to the last line', () => {
    expect(lineBounds(doc, 9)).toEqual({ start: 8, end: 13 });
  });
});
