import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import {
  pluginObsidianComments,
  stripObsidianComments,
} from '../../src/plugins/obsidianComments.ts';

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

describe('stripObsidianComments', () => {
  it('keeps the line count so later lines keep their numbers', () => {
    const src = 'a\n%%\nhidden\n\nmore\n%%\n- [ ] task';
    const out = stripObsidianComments(src);
    expect(out.split('\n')).toHaveLength(src.split('\n').length);
    expect(out.split('\n')[6]).toBe('- [ ] task');
    expect(out).not.toContain('hidden');
  });

  it('leaves %% inside fenced code alone (backticks and tildes)', () => {
    const src = '```c\nprintf("100%%\\n");\nprintf("%%d", x);\n```\n~~~\n%%x%%\n~~~\n%%gone%%';
    const out = stripObsidianComments(src);
    expect(out).toContain('printf("100%%\\n");\nprintf("%%d", x);');
    expect(out).toContain('~~~\n%%x%%\n~~~');
    expect(out).not.toContain('gone');
  });

  it('requires a closing fence of the same kind and at least the same length', () => {
    const src = '````\n```\n%%in code%%\n````\n%%out%%';
    const out = stripObsidianComments(src);
    expect(out).toContain('%%in code%%');
    expect(out).not.toContain('out');
  });

  it('matches code spans by backtick run length', () => {
    expect(stripObsidianComments('``a`%%b`` %%x%%')).toBe('``a`%%b`` ');
  });

  it('leaves %% inside inline code spans alone', () => {
    expect(stripObsidianComments('use `%%d` or ``a%%b`` %%x%%')).toBe('use `%%d` or ``a%%b`` ');
  });

  it('treats an unmatched backtick run as literal text', () => {
    expect(stripObsidianComments('a ` b %%c%% d')).toBe('a ` b  d');
    expect(stripObsidianComments('a ` b\n\nc `%%x%%')).toBe('a ` b\n\nc `');
  });

  it('keeps an unclosed %% literally', () => {
    expect(stripObsidianComments('50%% off')).toBe('50%% off');
  });

  it('handles an unterminated fence at end of input', () => {
    expect(stripObsidianComments('```\n%%x%%')).toBe('```\n%%x%%');
  });
});
