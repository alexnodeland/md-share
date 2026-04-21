import { describe, expect, it } from 'vitest';
import { computeOutline, focusSlice } from '../src/outline.ts';

describe('computeOutline', () => {
  it('returns an empty array for empty source', () => {
    expect(computeOutline('')).toEqual([]);
  });

  it('returns a single slice covering the whole document for one heading', () => {
    const src = '# Alpha\n\nSome text\nMore text';
    expect(computeOutline(src)).toEqual([{ id: 'alpha', level: 1, startLine: 0, endLine: 4 }]);
  });

  it('returns slices bounded by the next heading for multiple headings', () => {
    const src = ['# A', 'a1', '## B', 'b1', 'b2', '# C', 'c1'].join('\n');
    expect(computeOutline(src)).toEqual([
      { id: 'a', level: 1, startLine: 0, endLine: 2 },
      { id: 'b', level: 2, startLine: 2, endLine: 5 },
      { id: 'c', level: 1, startLine: 5, endLine: 7 },
    ]);
  });

  it('assigns unique ids when headings collide', () => {
    const src = '# Intro\ntext\n# Intro\ntext';
    const outline = computeOutline(src);
    expect(outline.map((s) => s.id)).toEqual(['intro', 'intro-2']);
  });

  it('ignores heading-like lines inside fenced code blocks', () => {
    const src = ['# Real', '```', '# Fake', '```', '## After'].join('\n');
    const outline = computeOutline(src);
    expect(outline.map((s) => s.id)).toEqual(['real', 'after']);
  });

  it('treats non-heading lines without a leading hash as regular content', () => {
    const src = 'paragraph\nmore prose\n';
    expect(computeOutline(src)).toEqual([]);
  });

  it('supports nested level changes', () => {
    const src = ['# A', '## A1', '### A1a', '## A2', '# B'].join('\n');
    const outline = computeOutline(src);
    expect(outline.map((s) => ({ id: s.id, level: s.level }))).toEqual([
      { id: 'a', level: 1 },
      { id: 'a1', level: 2 },
      { id: 'a1a', level: 3 },
      { id: 'a2', level: 2 },
      { id: 'b', level: 1 },
    ]);
  });
});

describe('focusSlice', () => {
  it('returns null when the id is not found', () => {
    expect(focusSlice('# A\ntext', 'missing')).toBeNull();
  });

  it('returns a section up to but not including the next same-or-higher heading', () => {
    const src = ['# A', 'a1', '# B', 'b1'].join('\n');
    expect(focusSlice(src, 'a')).toBe('# A\na1');
  });

  it('includes nested sub-sections when focusing a parent heading', () => {
    const src = ['# A', 'a1', '## A1', 'a1a', '### A1a', 'deep', '# B', 'b1'].join('\n');
    expect(focusSlice(src, 'a')).toBe('# A\na1\n## A1\na1a\n### A1a\ndeep');
  });

  it('returns only the leaf section when focusing the deepest heading', () => {
    const src = ['# A', 'a1', '## A1', 'a1a', '# B'].join('\n');
    expect(focusSlice(src, 'a1')).toBe('## A1\na1a');
  });

  it('returns content up to EOF when focusing the last heading', () => {
    const src = ['# A', 'a1', '# B', 'b1', 'b2'].join('\n');
    expect(focusSlice(src, 'b')).toBe('# B\nb1\nb2');
  });

  it('stops at a sibling heading of the same level', () => {
    const src = ['## A', 'a1', '## B', 'b1'].join('\n');
    expect(focusSlice(src, 'a')).toBe('## A\na1');
  });
});
