// Pure board renderer. Given a FEN string (or just the board field), produces
// an inline SVG string. No DOM, no chess.js — just string parsing + assembly,
// so the rest of the pipeline can lazy-load chess.js in the adapter.

const LIGHT = '#f0d9b5';
const DARK = '#b58863';
const BORDER = '#8b5a2b';
const WHITE_FILL = '#ffffff';
const BLACK_FILL = '#111111';
const STROKE = '#000000';

// Unicode chess glyphs. Uppercase = white, lowercase = black. We render white
// pieces with a white fill + dark stroke, black pieces with a black fill, so
// both read clearly on the alternating board squares.
const GLYPH: Record<string, string> = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

const SQUARE = 45;
const MARGIN = 18;
const BOARD_PX = SQUARE * 8;
const SIZE_PX = BOARD_PX + MARGIN * 2;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Parse the board field of a FEN (the bit before the first space). Returns an
// 8-row array, each row 8 entries long; empty squares are empty strings.
// Throws on malformed input.
const parseBoardField = (field: string): string[][] => {
  const ranks = field.split('/');
  if (ranks.length !== 8) {
    throw new Error(`FEN board must have 8 ranks, got ${ranks.length}`);
  }
  const board: string[][] = [];
  for (const rank of ranks) {
    const row: string[] = [];
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        const n = Number(ch);
        for (let i = 0; i < n; i++) row.push('');
      } else if (GLYPH[ch]) {
        row.push(ch);
      } else {
        throw new Error(`Invalid FEN piece character: ${ch}`);
      }
    }
    if (row.length !== 8) {
      throw new Error(`FEN rank must describe 8 squares, got ${row.length}: ${rank}`);
    }
    board.push(row);
  }
  return board;
};

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const renderSquare = (file: number, rank: number): string => {
  const x = MARGIN + file * SQUARE;
  const y = MARGIN + rank * SQUARE;
  const fill = (file + rank) % 2 === 0 ? LIGHT : DARK;
  return `<rect x="${x}" y="${y}" width="${SQUARE}" height="${SQUARE}" fill="${fill}"/>`;
};

const renderPiece = (piece: string, file: number, rank: number): string => {
  // parseBoardField already rejects anything outside GLYPH, so lookup is
  // guaranteed; assert non-null to keep branches testable.
  const glyph = GLYPH[piece] as string;
  const cx = MARGIN + file * SQUARE + SQUARE / 2;
  const cy = MARGIN + rank * SQUARE + SQUARE / 2;
  const isWhite = piece === piece.toUpperCase();
  const fill = isWhite ? WHITE_FILL : BLACK_FILL;
  const strokeAttr = isWhite ? ` stroke="${STROKE}" stroke-width="1"` : '';
  // dominant-baseline=central + text-anchor=middle centres the glyph in the
  // square without needing to know each piece's individual metrics.
  return (
    `<text x="${cx}" y="${cy}" font-family="serif" font-size="36" text-anchor="middle" ` +
    `dominant-baseline="central" fill="${fill}"${strokeAttr}>${glyph}</text>`
  );
};

const renderCoords = (): string => {
  const parts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const fx = MARGIN + i * SQUARE + SQUARE / 2;
    const fyBottom = MARGIN + 8 * SQUARE + MARGIN / 2 + 4;
    // FILES has exactly 8 entries; the index is in range.
    const file = FILES[i] as string;
    parts.push(
      `<text x="${fx}" y="${fyBottom}" font-family="sans-serif" font-size="10" text-anchor="middle" fill="currentColor">${file}</text>`,
    );
    const ry = MARGIN + i * SQUARE + SQUARE / 2 + 3;
    const rank = String(8 - i);
    parts.push(
      `<text x="${MARGIN / 2}" y="${ry}" font-family="sans-serif" font-size="10" text-anchor="middle" fill="currentColor">${rank}</text>`,
    );
  }
  return parts.join('');
};

export const renderBoard = (fen: string): string => {
  // String.prototype.split always returns at least one element; the first
  // entry is the board field (possibly an empty string).
  const field = fen.trim().split(/\s+/)[0] as string;
  const board = parseBoardField(field);

  const squares: string[] = [];
  const pieces: string[] = [];
  for (let rank = 0; rank < 8; rank++) {
    // parseBoardField guarantees 8 rows of 8 entries, so the lookups below
    // are always in range.
    const row = board[rank] as string[];
    for (let file = 0; file < 8; file++) {
      squares.push(renderSquare(file, rank));
      const piece = row[file] as string;
      if (piece) pieces.push(renderPiece(piece, file, rank));
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE_PX} ${SIZE_PX}" ` +
    `width="${SIZE_PX}" height="${SIZE_PX}" class="chess-board" role="img" ` +
    `aria-label="Chess board position">` +
    `<rect x="${MARGIN - 2}" y="${MARGIN - 2}" width="${BOARD_PX + 4}" height="${BOARD_PX + 4}" ` +
    `fill="none" stroke="${BORDER}" stroke-width="2"/>` +
    squares.join('') +
    pieces.join('') +
    renderCoords() +
    `</svg>`
  );
};

export const renderBoardError = (message: string, source: string): string => {
  const msg = escapeXml(message || 'Invalid chess position');
  const src = escapeXml(source.trim());
  return (
    `<div class="render-error"><strong>Chess render failed</strong>` +
    `<pre>${msg}</pre>` +
    (src ? `<pre class="render-error-src">${src}</pre>` : '') +
    `</div>`
  );
};
