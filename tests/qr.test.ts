import { describe, expect, it } from 'vitest';
import type { QrEncoder } from '../src/ports.ts';
import { addQuietZone, buildQr } from '../src/qr.ts';

const rejectingEncoder: QrEncoder = {
  encode: async () => {
    throw new Error('too long');
  },
};

const fixedEncoder = (matrix: boolean[][]): QrEncoder => ({
  encode: async () => matrix.map((row) => row.slice()),
});

const identity = [
  [true, false, true],
  [false, true, false],
  [true, false, true],
];

describe('addQuietZone', () => {
  it('returns a deep copy when quiet is zero', () => {
    const out = addQuietZone(identity, 0);
    expect(out).toEqual(identity);
    expect(out).not.toBe(identity);
    expect(out[0]).not.toBe(identity[0]);
  });

  it('returns a deep copy when quiet is negative', () => {
    const out = addQuietZone(identity, -1);
    expect(out).toEqual(identity);
  });

  it('adds a false-filled border of the requested width', () => {
    const out = addQuietZone(identity, 2);
    expect(out.length).toBe(7);
    for (const row of out.slice(0, 2)) expect(row.every((c) => c === false)).toBe(true);
    for (const row of out.slice(-2)) expect(row.every((c) => c === false)).toBe(true);
    for (const row of out) {
      expect(row.slice(0, 2).every((c) => c === false)).toBe(true);
      expect(row.slice(-2).every((c) => c === false)).toBe(true);
    }
  });

  it('preserves the original modules inside the quiet zone', () => {
    const out = addQuietZone(identity, 1);
    expect(out[1]!.slice(1, 4)).toEqual([true, false, true]);
    expect(out[2]!.slice(1, 4)).toEqual([false, true, false]);
    expect(out[3]!.slice(1, 4)).toEqual([true, false, true]);
  });

  it('tolerates an empty matrix', () => {
    const out = addQuietZone([], 3);
    expect(out.length).toBe(6);
    for (const row of out) expect(row.every((c) => c === false)).toBe(true);
  });

  it('coerces sparse row entries to false', () => {
    const sparse: boolean[][] = [new Array(3), new Array(3), new Array(3)];
    const out = addQuietZone(sparse, 1);
    expect(out.length).toBe(5);
    expect(out[1]!.slice(1, 4)).toEqual([false, false, false]);
    expect(out[2]!.slice(1, 4)).toEqual([false, false, false]);
    expect(out[3]!.slice(1, 4)).toEqual([false, false, false]);
  });
});

describe('buildQr', () => {
  it('uses the default quiet zone of 4 modules', async () => {
    const { matrix, modulesPerSide } = await buildQr(fixedEncoder(identity), 'hello');
    expect(modulesPerSide).toBe(3 + 4 * 2);
    expect(matrix.length).toBe(modulesPerSide);
  });

  it('respects caller-supplied quiet options', async () => {
    const { modulesPerSide } = await buildQr(fixedEncoder(identity), 'hi', { quietModules: 0 });
    expect(modulesPerSide).toBe(3);
  });

  it('propagates encoder rejections', async () => {
    await expect(buildQr(rejectingEncoder, 'x')).rejects.toThrow('too long');
  });
});
