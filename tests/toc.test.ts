import { describe, expect, it } from 'vitest';
import { renderTOC } from '../src/toc.ts';

const h = (level: number, text: string, slug = text.toLowerCase()) => ({ level, text, slug });

describe('renderTOC', () => {
  it('returns empty string for fewer than 3 h2–h4 headings', () => {
    expect(renderTOC([])).toBe('');
    expect(renderTOC([h(2, 'a'), h(2, 'b')])).toBe('');
    expect(renderTOC([h(1, 'Title'), h(2, 'a'), h(5, 'deep'), h(3, 'b')])).toBe('');
  });

  it('renders h2–h4 entries with level classes', () => {
    const html = renderTOC([h(1, 'Title'), h(2, 'One'), h(3, 'Two'), h(4, 'Three'), h(6, 'Six')]);
    expect(html).toContain('class="toc-container"');
    expect(html).toContain('<li class="toc-h2"><a href="#one">One</a></li>');
    expect(html).toContain('<li class="toc-h3"><a href="#two">Two</a></li>');
    expect(html).toContain('<li class="toc-h4"><a href="#three">Three</a></li>');
    expect(html).not.toContain('Title');
    expect(html).not.toContain('Six');
  });

  it('escapes heading text and slugs', () => {
    const html = renderTOC([h(2, '<img src=x onerror=alert(1)>', 'x"y'), h(2, 'b'), h(2, 'c')]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('href="#x&quot;y"');
  });
});
