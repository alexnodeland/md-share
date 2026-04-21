import { describe, expect, it } from 'vitest';
import { renderBoard, renderBoardError } from '../src/chessBoard.ts';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// All 32 starting pieces: 8 each of pawns (uppercase/lowercase), plus the
// back ranks. Using the raw glyphs lets us assert the rendered output
// actually contains them instead of just the FEN letters.
const WHITE_GLYPHS = ['♔', '♕', '♖', '♗', '♘', '♙'];
const BLACK_GLYPHS = ['♚', '♛', '♜', '♝', '♞', '♟'];

describe('renderBoard', () => {
  it('renders an SVG wrapper with the chess-board class', () => {
    const svg = renderBoard(STARTING_FEN);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('class="chess-board"');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('role="img"');
  });

  it('renders 64 square rects for the starting position', () => {
    const svg = renderBoard(STARTING_FEN);
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    // 64 squares + 1 border rect.
    expect(rectCount).toBe(65);
  });

  it('renders all 32 pieces for the starting position', () => {
    const svg = renderBoard(STARTING_FEN);
    const textCount = (svg.match(/<text /g) ?? []).length;
    // 32 pieces + 16 coordinate labels (8 files + 8 ranks).
    expect(textCount).toBe(32 + 16);
    for (const g of [...WHITE_GLYPHS, ...BLACK_GLYPHS]) expect(svg).toContain(g);
  });

  it('accepts bare board field without the trailing metadata', () => {
    const svg = renderBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    expect(svg).toContain('♔');
    expect(svg).toContain('♚');
  });

  it('renders kings-only (near-empty) position', () => {
    const svg = renderBoard('8/8/8/8/8/8/4K3/4k3 w - - 0 1');
    expect(svg).toContain('♔');
    expect(svg).toContain('♚');
    // no queens, rooks, bishops, knights, pawns
    for (const g of ['♕', '♖', '♗', '♘', '♙', '♛', '♜', '♝', '♞', '♟']) {
      expect(svg).not.toContain(g);
    }
  });

  it('renders a one-sided position (white only) without black pieces', () => {
    const svg = renderBoard('8/8/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1');
    for (const g of WHITE_GLYPHS) expect(svg).toContain(g);
    for (const g of BLACK_GLYPHS) expect(svg).not.toContain(g);
  });

  it('renders a completely empty board with no piece text elements', () => {
    const svg = renderBoard('8/8/8/8/8/8/8/8 w - - 0 1');
    // only the 16 coordinate labels, no pieces
    const textCount = (svg.match(/<text /g) ?? []).length;
    expect(textCount).toBe(16);
  });

  it('uses alternating light/dark fills for squares', () => {
    const svg = renderBoard(STARTING_FEN);
    expect(svg).toContain('fill="#f0d9b5"');
    expect(svg).toContain('fill="#b58863"');
  });

  it('includes file and rank coordinate labels', () => {
    const svg = renderBoard(STARTING_FEN);
    // files
    for (const f of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      expect(svg).toContain(`>${f}<`);
    }
    // ranks
    for (const r of ['1', '2', '3', '4', '5', '6', '7', '8']) {
      expect(svg).toContain(`>${r}<`);
    }
  });

  it('throws on FEN with wrong number of ranks', () => {
    expect(() => renderBoard('8/8/8/8/8/8/8 w - - 0 1')).toThrow(/8 ranks/);
  });

  it('throws on FEN with an invalid piece character', () => {
    expect(() => renderBoard('rnbqkbnr/ppppXppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')).toThrow(
      /Invalid FEN piece character/,
    );
  });

  it('throws on FEN rank that does not describe 8 squares', () => {
    // 7 pawns + digit 1 = 8, so we use 7 pawns alone to make a too-short rank.
    expect(() => renderBoard('rnbqkbnr/ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')).toThrow(
      /8 squares/,
    );
  });
});

describe('renderBoardError', () => {
  it('wraps the error message in a render-error block', () => {
    const html = renderBoardError('Bad FEN', 'rnbqkbnr');
    expect(html).toContain('class="render-error"');
    expect(html).toContain('<strong>Chess render failed</strong>');
    expect(html).toContain('Bad FEN');
    expect(html).toContain('rnbqkbnr');
  });

  it('falls back to a generic message when the input is empty', () => {
    const html = renderBoardError('', 'src');
    expect(html).toContain('Invalid chess position');
  });

  it('escapes HTML in the message and the source', () => {
    const html = renderBoardError('<x>', '<y>');
    expect(html).toContain('&lt;x&gt;');
    expect(html).toContain('&lt;y&gt;');
  });

  it('omits the source pre when no source is provided', () => {
    const html = renderBoardError('Something went wrong', '');
    expect(html).not.toContain('render-error-src');
  });
});
