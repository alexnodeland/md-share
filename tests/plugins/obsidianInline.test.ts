import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { pluginObsidianInline } from '../../src/plugins/obsidianInline.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  pluginObsidianInline(md);
  return md;
};

describe('wikilink', () => {
  it('renders [[target]] as a wikilink span with title=target', () => {
    const html = build().render('see [[My Note]] here');
    expect(html).toContain('<span class="wikilink" title="My Note">My Note</span>');
  });

  it('renders [[target|alias]] with alias text and title=target', () => {
    const html = build().render('see [[Target|Click]] here');
    expect(html).toContain('<span class="wikilink" title="Target">Click</span>');
  });

  it('escapes HTML in both target and display', () => {
    const html = build().render('[[<script>|<img>]]');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img&gt;');
  });

  it('leaves unclosed [[ alone', () => {
    const html = build().render('[[unterminated');
    expect(html).not.toContain('class="wikilink"');
  });
});

describe('highlight', () => {
  it('renders ==text== as <mark>', () => {
    const html = build().render('this is ==highlighted==');
    expect(html).toContain('<mark>highlighted</mark>');
  });

  it('escapes HTML inside highlight', () => {
    const html = build().render('==<b>==');
    expect(html).toContain('<mark>&lt;b&gt;</mark>');
  });

  it('leaves unclosed == alone', () => {
    const html = build().render('word == unterminated');
    expect(html).not.toContain('<mark>');
  });
});

describe('obsidian tag', () => {
  it('renders #tag as span with obsidian-tag class', () => {
    const html = build().render('see #docs for more');
    expect(html).toContain('<span class="obsidian-tag">#docs</span>');
  });

  it('supports #nested/tag with slashes', () => {
    const html = build().render('use #project/md-render tag');
    expect(html).toContain('>#project/md-render<');
  });

  it('does not treat #anchor in a word context as a tag (e.g. abc#def)', () => {
    const html = build().render('foo#bar');
    expect(html).not.toContain('obsidian-tag');
  });

  it('recognizes a tag at the start of the line', () => {
    const html = build().render('#alone');
    expect(html).toContain('obsidian-tag');
  });
});
