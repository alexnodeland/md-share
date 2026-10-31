import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { detectFlavor } from '../src/detectFlavor.ts';
import { SAMPLE_FLAVOR, type SampleKey, sampleFor } from '../src/samples.ts';

describe('detectFlavor', () => {
  it('recognises each flavored sample as its own flavor', () => {
    const flavored: SampleKey[] = ['extended', 'academic', 'gfm', 'obsidian', 'atlassian'];
    for (const key of flavored) expect(detectFlavor(sampleFor(key)), key).toBe(SAMPLE_FLAVOR[key]);
  });

  it('says nothing about plain CommonMark', () => {
    expect(detectFlavor(sampleFor('commonmark'))).toBeNull();
    expect(detectFlavor('# Title\n\nJust *prose* and a [link](https://x.y).')).toBeNull();
    expect(detectFlavor('')).toBeNull();
  });

  it.each([
    ['{info}\nHeads up\n{info}', 'atlassian'],
    ['{panel:title=Notes}\nx\n{panel}', 'atlassian'],
    ['Build is {status:colour=Green|title=OK}', 'atlassian'],
    ['> [!tip] Pack light\n> One bag.', 'obsidian'],
    ['See [[Other note]] for more.', 'obsidian'],
    ['![[diagram.png]]', 'obsidian'],
    ['Visible %%hidden comment%% text', 'obsidian'],
    ['As shown [@knuth1984].', 'academic'],
    ['$$\n{#eq:energy}', 'academic'],
    ['![Plot](p.png){#fig:plot}', 'academic'],
    ['$$\nE = mc^2\n$$', 'academic'],
    ['```bibliography\n@book{x, title={T}}\n```', 'academic'],
    ['Text[^1]\n\n[^1]: The note.', 'extended'],
    ['Term\n: Its definition', 'extended'],
    ['Term\n\n: Its definition', 'extended'],
    ['- [ ] todo\n- [x] done', 'gfm'],
    ['| a | b |\n|---|:-:|\n| 1 | 2 |', 'gfm'],
    ['a | b\n--- | ---\n1 | 2', 'gfm'],
    ['| only |\n|------|\n| one |', 'gfm'],
    ['That was ~~wrong~~ right.', 'gfm'],
  ] as const)('detects %j as %s', (text, flavor) => {
    expect(detectFlavor(text)).toBe(flavor);
  });

  it('prefers the more specific flavor when markers mix', () => {
    // Obsidian renders tables, tasks and math too; GitHub has no footnotes.
    expect(detectFlavor('> [!note] x\n\n- [ ] task\n\n$$x$$')).toBe('obsidian');
    expect(detectFlavor('| a |\n|---|\n\nText[^1]\n\n[^1]: n')).toBe('extended');
    expect(detectFlavor('{info}\nSee [[x]]\n{info}')).toBe('atlassian');
  });

  it('ignores markers inside code', () => {
    expect(detectFlavor('Type `[[link]]` for wikilinks.')).toBeNull();
    expect(detectFlavor('```md\n> [!tip] x\n- [ ] y\n```\n\nPlain.')).toBeNull();
    expect(detectFlavor('~~~\n{info}\n~~~')).toBeNull();
    // An unclosed fence runs to the end of the document, as in CommonMark.
    expect(detectFlavor('Intro\n\n```\n[[x]]\n| a |\n|---|')).toBeNull();
  });

  it('does not mistake ordinary punctuation for markers', () => {
    expect(detectFlavor('Costs $5 and $10.')).toBeNull();
    expect(detectFlavor('Email me @ home, or ping @alex.')).toBeNull();
    expect(detectFlavor('Ratio 3:1\n\nA line\n:not a definition')).toBeNull();
    expect(detectFlavor('Use {braces} freely.')).toBeNull();
    expect(detectFlavor('~ approx ~')).toBeNull();
    expect(detectFlavor('Above\n\n---\n\nBelow')).toBeNull();
  });
});

// scripts/generate-share-link.mjs is a standalone file (it is curl'd on its
// own), so it carries a copy of the detector. Keep the two in step.
describe('generate-share-link.mjs flavor detection', () => {
  const dir = mkdtempSync(join(tmpdir(), 'md-share-detect-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const script = resolve(import.meta.dirname, '../scripts/generate-share-link.mjs');
  const linkFor = (text: string, ...args: string[]): string => {
    const file = join(dir, 'doc.md');
    writeFileSync(file, text);
    return execFileSync(process.execPath, [script, file, ...args], { encoding: 'utf8' }).trim();
  };
  const flavorOf = (link: string): string =>
    new URLSearchParams(new URL(link).hash.slice(1)).get('f') ?? 'commonmark';

  it('agrees with detectFlavor on every sample', () => {
    const keys: SampleKey[] = [
      'commonmark',
      'extended',
      'academic',
      'gfm',
      'obsidian',
      'atlassian',
    ];
    for (const key of keys) {
      const text = sampleFor(key);
      expect(flavorOf(linkFor(text)), key).toBe(detectFlavor(text) ?? 'commonmark');
    }
  });

  it('agrees on markers hidden in code', () => {
    const text = 'Type `[[x]]`.\n\n```\n> [!tip] y\n```';
    expect(flavorOf(linkFor(text))).toBe('commonmark');
  });

  it('lets --flavor override detection', () => {
    expect(flavorOf(linkFor('See [[x]].', '--flavor=commonmark'))).toBe('commonmark');
    expect(flavorOf(linkFor('Plain.', '--flavor=gfm'))).toBe('gfm');
  });
});
