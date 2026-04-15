import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginObsidianComments } from '../../src/plugins/obsidianComments.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginObsidianComments(md);
  return md;
};

describe('pluginObsidianComments', () => {
  it('strips inline %%comments%% from output', () => {
    const html = build().render('hello %%hidden%% world');
    expect(html).not.toContain('hidden');
    expect(html).toContain('hello');
    expect(html).toContain('world');
  });

  it('strips multi-line comments', () => {
    const html = build().render('before %%line1\nline2%% after');
    expect(html).not.toContain('line1');
    expect(html).not.toContain('line2');
  });

  it('strips multiple comments in one document', () => {
    const html = build().render('a %%one%% b %%two%% c');
    expect(html).not.toContain('one');
    expect(html).not.toContain('two');
    expect(html).toMatch(/a\s+b\s+c/);
  });

  it('leaves documents without comments unchanged', () => {
    const html = build().render('plain paragraph');
    expect(html).toContain('plain paragraph');
  });
});
