import { renderBoard, renderBoardError } from '../chessBoard.ts';
import type { DiagramRenderer } from '../ports.ts';

type ChessMod = typeof import('chess.js');

let mod: ChessMod | null = null;
let pending: Promise<ChessMod> | null = null;

const loadLib = (): Promise<ChessMod> => {
  if (mod) return Promise.resolve(mod);
  if (!pending) {
    pending = import('chess.js').then((m) => {
      mod = m;
      return mod;
    });
  }
  return pending;
};

const looksLikeFen = (text: string): boolean => {
  const first = text.trim().split(/\r?\n/)[0] ?? '';
  // A FEN has 6 space-delimited fields; the first contains slashes separating
  // the 8 ranks. PGN lines never match both.
  const parts = first.split(/\s+/);
  return parts.length >= 2 && (parts[0] ?? '').includes('/');
};

const fenFromSource = (source: string, chessMod: ChessMod): string => {
  const trimmed = source.trim();
  if (!trimmed) throw new Error('Empty chess block');
  if (looksLikeFen(trimmed)) {
    const fen = trimmed.split(/\r?\n/)[0] ?? '';
    // Validate via chess.js so malformed FENs produce a clear error.
    const result = chessMod.validateFen(fen);
    if (!result.ok) throw new Error(result.error ?? 'Invalid FEN');
    return fen;
  }
  // Fall back to PGN: instantiate Chess, loadPgn, read final fen().
  const game = new chessMod.Chess();
  game.loadPgn(trimmed);
  return game.fen();
};

export const browserChessRenderer: DiagramRenderer = {
  render: async (source) => {
    try {
      const chessMod = await loadLib();
      const fen = fenFromSource(source, chessMod);
      return renderBoard(fen);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return renderBoardError(message, source);
    }
  },
};
