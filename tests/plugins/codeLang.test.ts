import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { addCodeLangLabels } from '../../src/plugins/codeLang.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  addCodeLangLabels(md);
  return md;
};

describe('addCodeLangLabels', () => {
  it('adds data-lang to fences with a language', () => {
    const html = build().render('```js\nconst x = 1;\n```');
    expect(html).toContain('data-lang="js"');
  });

  it('lowercases the language', () => {
    const html = build().render('```JavaScript\nx\n```');
    expect(html).toContain('data-lang="javascript"');
  });

  it('keeps only the first info-string word', () => {
    const html = build().render('```python linenums="1"\nx = 1\n```');
    expect(html).toContain('data-lang="python"');
  });

  it('does not label mermaid fences', () => {
    const html = build().render('```mermaid\ngraph TD\nA-->B\n```');
    expect(html).not.toContain('data-lang');
  });

  it('does not label fences without a language', () => {
    const html = build().render('```\nplain\n```');
    expect(html).not.toContain('data-lang');
  });

  it('escapes unusual characters in the language name', () => {
    const html = build().render('```"><script>\nx\n```');
    expect(html).toContain('data-lang="&quot;&gt;&lt;script&gt;"');
  });

  it('returns empty string when the token is missing', () => {
    const md = build();
    const fence = md.renderer.rules.fence as NonNullable<typeof md.renderer.rules.fence>;
    expect(fence([], 0, md.options, {}, md.renderer)).toBe('');
  });
});
