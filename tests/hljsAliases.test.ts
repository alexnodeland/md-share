import hljs from 'highlight.js';
import { describe, expect, it } from 'vitest';
import { LANGUAGE_ALIASES, languageFile } from '../src/hljsAliases.ts';

describe('languageFile', () => {
  it('resolves common fence aliases to grammar files', () => {
    expect(languageFile('js')).toBe('javascript');
    expect(languageFile('py')).toBe('python');
    expect(languageFile('sh')).toBe('bash');
    expect(languageFile('yml')).toBe('yaml');
    expect(languageFile('clj')).toBe('clojure');
  });

  it('is case-insensitive and passes real names through', () => {
    expect(languageFile('TS')).toBe('typescript');
    expect(languageFile('rust')).toBe('rust');
  });
});

describe('LANGUAGE_ALIASES', () => {
  it('matches the installed highlight.js (run `npm run gen:hljs-aliases` after upgrading)', () => {
    const expected: Record<string, string> = {};
    for (const name of hljs.listLanguages()) {
      for (const alias of hljs.getLanguage(name)?.aliases ?? [])
        expected[alias.toLowerCase()] = name;
    }
    expect(LANGUAGE_ALIASES).toEqual(expected);
  });
});
