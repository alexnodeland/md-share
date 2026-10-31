import { describe, expect, it } from 'vitest';
import { EMPTY_STATE_SAMPLES, renderEmptyState } from '../src/emptyState.ts';
import { SAMPLES } from '../src/samples.ts';

describe('renderEmptyState', () => {
  it('offers a button for each featured sample', () => {
    const html = renderEmptyState();
    for (const key of EMPTY_STATE_SAMPLES) {
      expect(html).toContain(`data-sample="${key}"`);
    }
    expect(html).toContain('>GitHub</button>');
  });

  it('says what it is for and offers a way into the editor', () => {
    const html = renderEmptyState();
    expect(html).toContain('Paste Markdown from anywhere');
    expect(html).toContain('data-start-writing');
    expect(html).toContain('Nothing leaves your browser');
  });

  it('only features samples that exist', () => {
    for (const key of EMPTY_STATE_SAMPLES) expect(SAMPLES[key]).toBeTruthy();
  });

  it('accepts a custom sample list', () => {
    const html = renderEmptyState(['commonmark']);
    expect(html).toContain('data-sample="commonmark"');
    expect(html).not.toContain('data-sample="gfm"');
  });
});
