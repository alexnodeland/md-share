// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { groupBetweenBreaks } from '../src/slides.ts';

const mk = (tag: string, text = ''): Element => {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
};

describe('groupBetweenBreaks', () => {
  it('returns an empty array for no children', () => {
    expect(groupBetweenBreaks([])).toEqual([]);
  });

  it('returns a single group when there are no HR elements', () => {
    const children = [mk('p', 'one'), mk('p', 'two')];
    const groups = groupBetweenBreaks(children);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(children);
  });

  it('splits siblings on a single HR into two groups', () => {
    const a = mk('p', 'a');
    const b = mk('p', 'b');
    const groups = groupBetweenBreaks([a, mk('hr'), b]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual([a]);
    expect(groups[1]).toEqual([b]);
  });

  it('drops an empty leading slide when HR comes first', () => {
    const a = mk('p', 'a');
    const groups = groupBetweenBreaks([mk('hr'), a]);
    expect(groups).toEqual([[a]]);
  });

  it('drops an empty trailing slide when HR comes last', () => {
    const a = mk('p', 'a');
    const groups = groupBetweenBreaks([a, mk('hr')]);
    expect(groups).toEqual([[a]]);
  });

  it('drops empty slides from consecutive HRs', () => {
    const a = mk('p', 'a');
    const b = mk('p', 'b');
    const groups = groupBetweenBreaks([a, mk('hr'), mk('hr'), b]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual([a]);
    expect(groups[1]).toEqual([b]);
  });

  it('preserves element order within each slide', () => {
    const a = mk('h1', 'Title');
    const b = mk('p', 'lead');
    const c = mk('ul');
    const groups = groupBetweenBreaks([a, b, c]);
    expect(groups).toEqual([[a, b, c]]);
  });
});
