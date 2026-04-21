import type { QrEncoder } from './ports.ts';

export interface QrRendering {
  matrix: boolean[][];
  modulesPerSide: number;
}

export interface QrOptions {
  quietModules?: number;
}

const DEFAULT_QUIET = 4;

export const addQuietZone = (matrix: boolean[][], quiet: number): boolean[][] => {
  if (quiet <= 0) return matrix.map((row) => row.slice());
  const inner = matrix.length;
  const size = inner + quiet * 2;
  const out: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = new Array(size).fill(false);
    const innerRow = r - quiet;
    const src = innerRow >= 0 && innerRow < inner ? matrix[innerRow] : undefined;
    if (src) {
      for (let c = 0; c < inner; c++) row[c + quiet] = src[c] ?? false;
    }
    out.push(row);
  }
  return out;
};

export const buildQr = async (
  encoder: QrEncoder,
  text: string,
  opts: QrOptions = {},
): Promise<QrRendering> => {
  const raw = await encoder.encode(text);
  const quiet = opts.quietModules ?? DEFAULT_QUIET;
  const matrix = addQuietZone(raw, quiet);
  return { matrix, modulesPerSide: matrix.length };
};
