import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginBlockLang } from '../../src/plugins/blockLang.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginBlockLang(md);
  return md;
};

describe('pluginBlockLang', () => {
  it('strips the directive line from the output', () => {
    const html = build().render('[[lang:fr]]\n\nBonjour');
    expect(html).not.toContain('[[lang');
    expect(html).toContain('Bonjour');
  });

  it('applies lang to subsequent paragraphs', () => {
    const html = build().render('[[lang:fr]]\n\nBonjour le monde');
    expect(html).toContain('<p lang="fr">Bonjour le monde</p>');
  });

  it('applies lang to subsequent headings', () => {
    const html = build().render('[[lang:de]]\n\n## Hallo');
    expect(html).toMatch(/<h2\s+lang="de">/);
  });

  it('applies lang to subsequent unordered lists', () => {
    const html = build().render('[[lang:es]]\n\n- uno\n- dos');
    expect(html).toMatch(/<ul\s+lang="es">/);
  });

  it('applies lang to subsequent ordered lists', () => {
    const html = build().render('[[lang:ja]]\n\n1. first\n2. second');
    expect(html).toMatch(/<ol\s+lang="ja">/);
  });

  it('applies lang to subsequent blockquotes', () => {
    const html = build().render('[[lang:it]]\n\n> ciao');
    expect(html).toMatch(/<blockquote\s+lang="it">/);
  });

  it('accepts a full BCP-47 tag with region (pt-BR)', () => {
    const html = build().render('[[lang:pt-BR]]\n\nOi');
    expect(html).toContain('<p lang="pt-BR">Oi</p>');
  });

  it('accepts 3-letter primary tags (cmn)', () => {
    const html = build().render('[[lang:cmn]]\n\nHi');
    expect(html).toContain('<p lang="cmn">Hi</p>');
  });

  it('switches language when a new directive appears', () => {
    const html = build().render('[[lang:fr]]\n\nBonjour\n\n[[lang:de]]\n\nHallo');
    expect(html).toContain('<p lang="fr">Bonjour</p>');
    expect(html).toContain('<p lang="de">Hallo</p>');
  });

  it('does not apply lang to blocks preceding the first directive', () => {
    const html = build().render('First paragraph.\n\n[[lang:fr]]\n\nDeuxième.');
    expect(html).toMatch(/<p>First paragraph\.<\/p>/);
    expect(html).toContain('<p lang="fr">Deuxième.</p>');
  });

  it('silently drops invalid language tags (bad format)', () => {
    const html = build().render('[[lang:123]]\n\nStill english');
    expect(html).not.toContain('[[lang');
    expect(html).not.toContain('lang="');
    expect(html).toContain('Still english');
  });

  it('silently drops obviously-wrong tags like lowercase regions', () => {
    const html = build().render('[[lang:fr-fr]]\n\nOops');
    expect(html).not.toContain('[[lang');
    expect(html).not.toContain('lang=');
  });

  it('an invalid directive also resets any previously-set language', () => {
    const html = build().render(
      '[[lang:fr]]\n\nBonjour\n\n[[lang:xx-xx]]\n\nplain again\n\nstill plain',
    );
    expect(html).toContain('<p lang="fr">Bonjour</p>');
    // "xx-xx" fails region uppercase check → invalid → lang resets to null.
    expect(html).toContain('<p>plain again</p>');
    expect(html).toContain('<p>still plain</p>');
  });

  it('leaves inline text containing [[lang:…]] alone (not at start of line)', () => {
    const html = build().render('inline [[lang:fr]] marker in prose');
    expect(html).toContain('inline [[lang:fr]] marker in prose');
    expect(html).not.toContain('lang="fr"');
  });

  it('does not touch paragraphs whose inline content has extra text alongside the directive', () => {
    const html = build().render('[[lang:fr]] and more text');
    // Multi-line/multi-token — regex requires the directive alone on its line.
    expect(html).toContain('and more text');
    expect(html).not.toMatch(/<p lang=/);
  });

  it('leaves documents without any directive untouched', () => {
    const html = build().render('Plain\n\n## Heading\n\n- item');
    expect(html).not.toContain('lang=');
    expect(html).toContain('<p>Plain</p>');
  });

  it('ignores directives wrapped with surrounding whitespace', () => {
    const html = build().render('[[lang:fr]]   \n\nBonjour');
    expect(html).toContain('<p lang="fr">Bonjour</p>');
  });

  it('propagates the language across several blocks until the next directive', () => {
    const html = build().render('[[lang:fr]]\n\n# Titre\n\nparagraphe\n\n- item\n\n> citation');
    expect(html).toMatch(/<h1\s+lang="fr">/);
    expect(html).toContain('<p lang="fr">paragraphe</p>');
    expect(html).toMatch(/<ul\s+lang="fr">/);
    expect(html).toMatch(/<blockquote\s+lang="fr">/);
  });
});
