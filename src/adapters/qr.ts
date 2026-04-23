import type { QrEncoder } from '../ports.ts';

type QrcodeFactory = typeof import('qrcode-generator');

let mod: QrcodeFactory | null = null;
let pending: Promise<QrcodeFactory> | null = null;

const loadLib = (): Promise<QrcodeFactory> => {
  if (mod) return Promise.resolve(mod);
  if (!pending) {
    pending = import('qrcode-generator').then((m) => {
      const factory = (m as unknown as { default?: QrcodeFactory }).default ?? m;
      mod = factory as QrcodeFactory;
      return mod;
    });
  }
  return pending;
};

export const browserQrEncoder: QrEncoder = {
  encode: async (text) => {
    const qrcode = await loadLib();
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const matrix: boolean[][] = [];
    for (let r = 0; r < n; r++) {
      const row: boolean[] = new Array(n);
      for (let c = 0; c < n; c++) row[c] = qr.isDark(r, c);
      matrix.push(row);
    }
    return matrix;
  },
};
