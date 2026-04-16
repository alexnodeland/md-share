import hljs from 'highlight.js';
import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { buildMD, createFlavorDeps, FLAVOR_LABELS } from '../src/flavors.ts';
import { SAMPLES } from '../src/samples.ts';
import { FLAVOR_NAMES } from '../src/types.ts';

const deps = () => createFlavorDeps(hljs, katex);

describe('buildMD', () => {
  it.each(FLAVOR_NAMES)('builds a MarkdownIt instance for flavor=%s', (flavor) => {
    const md = buildMD(flavor, deps());
    expect(md).toBeDefined();
    expect(md.render('# Hello')).toContain('<h1');
  });

  it.each(FLAVOR_NAMES)('renders the default document for flavor=%s without throwing', (flavor) => {
    const md = buildMD(flavor, deps());
    const src = SAMPLES[flavor];
    expect(() => md.render(src)).not.toThrow();
  });

  it('gfm supports task lists', () => {
    const md = buildMD('gfm', deps());
    expect(md.render('- [x] done')).toContain('task-list-item');
  });

  it('commonmark does NOT apply task-list plugin', () => {
    const md = buildMD('commonmark', deps());
    const html = md.render('- [x] done');
    expect(html).not.toContain('task-list-item');
  });

  it('extended supports footnotes', () => {
    const md = buildMD('extended', deps());
    const html = md.render('text[^1]\n\n[^1]: note');
    expect(html).toContain('footnote');
  });

  it('academic supports KaTeX math', () => {
    const md = buildMD('academic', deps());
    expect(md.render('$E=mc^2$')).toContain('katex');
  });

  it('obsidian supports wikilinks', () => {
    const md = buildMD('obsidian', deps());
    expect(md.render('[[page]]')).toContain('class="wikilink"');
  });

  it('atlassian supports status badges', () => {
    const md = buildMD('atlassian', deps());
    expect(md.render('{status:color=red|title=X}')).toContain('atl-status-red');
  });

  it('adds heading anchors regardless of flavor', () => {
    const md = buildMD('gfm', deps());
    expect(md.render('## Sub')).toContain('id="sub"');
  });

  it('wraps mermaid fences regardless of flavor', () => {
    const md = buildMD('gfm', deps());
    expect(md.render('```mermaid\nA\n```')).toContain('mermaid-container');
  });
});

describe('FLAVOR_LABELS', () => {
  it('has a label for every flavor', () => {
    for (const flavor of FLAVOR_NAMES) {
      expect(FLAVOR_LABELS[flavor]).toBeTruthy();
    }
  });
});
