import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { createChessCounter, wrapChessFences } from '../../src/plugins/chess.ts';

const build = () => {
  const md = new MarkdownIt({ html: true });
  const counter = createChessCounter();
  wrapChessFences(md, counter);
  return { md, counter };
};

describe('wrapChessFences', () => {
  it('wraps chess fences in a container with a sequential id', () => {
    const { md } = build();
    const html = md.render(
      '```chess\nrnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\n```\n\n```chess\n8/8/8/8/8/8/4K3/4k3 w - - 0 1\n```',
    );
    expect(html).toContain('id="chess-0"');
    expect(html).toContain('id="chess-1"');
    expect(html).toContain('class="chess-container"');
  });

  it('escapes HTML in chess source so angle-bracketed junk cannot inject', () => {
    const { md } = build();
    const html = md.render('```chess\n<script>\n```');
    expect(html).toContain('&lt;script&gt;');
  });

  it('leaves non-chess fences alone', () => {
    const { md } = build();
    const html = md.render('```\nplain code\n```');
    expect(html).not.toContain('chess-container');
  });

  it('is case-insensitive for the chess info string', () => {
    const { md } = build();
    const html = md.render('```CHESS\nrnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1\n```');
    expect(html).toContain('chess-container');
  });

  it('counter.reset() restarts numbering', () => {
    const { md, counter } = build();
    md.render('```chess\n8/8/8/8/8/8/4K3/4k3 w - - 0 1\n```');
    counter.reset();
    const html = md.render('```chess\n8/8/8/8/8/8/4K3/4k3 w - - 0 1\n```');
    expect(html).toContain('id="chess-0"');
  });

  it('counter advances monotonically across separate renders', () => {
    const { md } = build();
    md.render('```chess\n8/8/8/8/8/8/4K3/4k3 w - - 0 1\n```');
    const second = md.render('```chess\n8/8/8/8/8/8/4K3/4k3 w - - 0 1\n```');
    expect(second).toContain('id="chess-1"');
  });
});
