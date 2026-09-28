import { encode } from 'uqr';
import { describe, expect, it } from 'vitest';
import { fitsInQr, QR_MAX_URL_LENGTH, qrDisplaySize, qrPath, qrSvg } from '../src/qr.ts';

describe('qrPath', () => {
  it('merges horizontal runs of dark modules', () => {
    expect(
      qrPath([
        [true, true, false, true],
        [false, false, false, false],
        [false, true, true, true],
      ]),
    ).toBe('M0 0h2v1h-2zM3 0h1v1h-1zM1 2h3v1h-3z');
  });

  it('is empty for a blank matrix', () => {
    expect(qrPath([[false, false]])).toBe('');
  });
});

describe('qrSvg', () => {
  it('draws a real QR code dark-on-white inside a quiet zone', () => {
    const { data, size } = encode('https://example.com/#d=df1.abc', { ecc: 'L', border: 0 });
    const svg = qrSvg(data, 'QR code');
    expect(svg).toContain(`viewBox="-4 -4 ${size + 8} ${size + 8}"`);
    const px = qrDisplaySize(size + 8);
    expect(svg).toContain(`width="${px}" height="${px}"`);
    expect(svg).toContain('fill="#fff"');
    expect(svg).toContain('<path fill="#000" d="M0 0h7v1h-7z'); // top-left finder pattern
  });

  it('escapes the accessible label', () => {
    expect(qrSvg([[true]], 'a "b" <c>')).toContain('aria-label="a &quot;b&quot; &lt;c&gt;"');
  });
});

describe('fitsInQr', () => {
  it('accepts URLs up to the comfortable scanning limit', () => {
    expect(fitsInQr('x'.repeat(QR_MAX_URL_LENGTH))).toBe(true);
    expect(fitsInQr('x'.repeat(QR_MAX_URL_LENGTH + 1))).toBe(false);
  });
});

describe('qrDisplaySize', () => {
  it('uses a whole number of pixels per module near 300px', () => {
    expect(qrDisplaySize(41)).toBe(246); // 6 px/module (capped)
    expect(qrDisplaySize(61)).toBe(244); // 4 px/module
    expect(qrDisplaySize(99)).toBe(297); // 3 px/module
  });

  it('never drops below 3 px/module, even for the densest codes', () => {
    expect(qrDisplaySize(121)).toBe(363);
    expect(qrDisplaySize(157)).toBe(471);
  });
});
