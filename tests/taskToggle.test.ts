import { describe, expect, it } from 'vitest';
import { toggleTaskAtLine } from '../src/taskToggle.ts';

describe('toggleTaskAtLine', () => {
  it('toggles unchecked to checked', () => {
    const source = '- [ ] todo';
    expect(toggleTaskAtLine(source, 0)).toBe('- [x] todo');
  });

  it('toggles checked to unchecked', () => {
    const source = '- [x] done';
    expect(toggleTaskAtLine(source, 0)).toBe('- [ ] done');
  });

  it('treats uppercase X as checked', () => {
    expect(toggleTaskAtLine('- [X] shout', 0)).toBe('- [ ] shout');
  });

  it('preserves indentation and marker style', () => {
    const source = 'prelude\n  * [ ] nested';
    expect(toggleTaskAtLine(source, 1)).toBe('prelude\n  * [x] nested');
  });

  it('supports ordered-list markers', () => {
    expect(toggleTaskAtLine('1. [ ] first', 0)).toBe('1. [x] first');
  });

  it('returns source unchanged for lines without a task marker', () => {
    const source = '# heading\njust text';
    expect(toggleTaskAtLine(source, 1)).toBe(source);
  });

  it('returns source unchanged when the line is out of range', () => {
    const source = '- [ ] only';
    expect(toggleTaskAtLine(source, 5)).toBe(source);
  });
});
