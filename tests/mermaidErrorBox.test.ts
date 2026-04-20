import { describe, expect, it } from 'vitest';
import { buildMermaidError } from '../src/mermaidErrorBox.ts';

describe('buildMermaidError', () => {
  it('wraps the message in a render-error box', () => {
    const html = buildMermaidError('graph LR; A --> B', 'Parse error');
    expect(html).toContain('class="render-error"');
    expect(html).toContain('<strong>Mermaid render failed</strong>');
    expect(html).toContain('Parse error');
    expect(html).toContain('graph LR; A --&gt; B');
  });

  it('strips a leading "Error:" prefix from the message', () => {
    const html = buildMermaidError('', 'Error: Something bad');
    expect(html).toContain('Something bad');
    expect(html).not.toContain('Error: Something bad');
  });

  it('escapes HTML in source and message', () => {
    const html = buildMermaidError('<img src=x>', '<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img src=x&gt;');
  });

  it('omits the source pre when source is empty', () => {
    const html = buildMermaidError('', 'bad');
    expect(html).not.toContain('render-error-src');
  });

  it('falls back to a default message when message is blank', () => {
    const html = buildMermaidError('x', '   ');
    expect(html).toContain('Diagram could not be rendered');
  });
});
