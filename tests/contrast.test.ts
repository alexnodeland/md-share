import { describe, expect, it } from 'vitest';
import { contrastRatio, parseColor, relativeLuminance, wcagLevel } from '../src/contrast.ts';

describe('parseColor — hex', () => {
  it('parses #rrggbb', () => {
    expect(parseColor('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('parses #rgb (short form)', () => {
    expect(parseColor('#f80')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('parses #rrggbbaa (ignoring alpha)', () => {
    expect(parseColor('#ff880080')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('parses #rgba (ignoring alpha)', () => {
    expect(parseColor('#f808')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('accepts uppercase hex', () => {
    expect(parseColor('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('rejects non-hex characters', () => {
    expect(parseColor('#zzzzzz')).toBeNull();
  });

  it('rejects malformed hex lengths', () => {
    expect(parseColor('#12')).toBeNull();
    expect(parseColor('#12345')).toBeNull();
    expect(parseColor('#1234567')).toBeNull();
    expect(parseColor('#123456789')).toBeNull();
  });
});

describe('parseColor — rgb / rgba', () => {
  it('parses rgb(r, g, b) comma form', () => {
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('parses rgba(r, g, b, a) and ignores alpha', () => {
    expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('parses rgb(r g b / a) space-slash form', () => {
    expect(parseColor('rgb(10 20 30 / 0.5)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('accepts percentage channels', () => {
    expect(parseColor('rgb(100%, 50%, 0%)')).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('clamps out-of-range channel values', () => {
    expect(parseColor('rgb(300, -5, 128)')).toEqual({ r: 255, g: 0, b: 128 });
  });

  it('rejects non-numeric channels', () => {
    expect(parseColor('rgb(foo, bar, baz)')).toBeNull();
  });

  it('rejects a missing channel', () => {
    expect(parseColor('rgb(10, 20)')).toBeNull();
  });

  it('rejects malformed (no parens)', () => {
    expect(parseColor('rgb 10 20 30')).toBeNull();
  });

  it('rejects a non-numeric percentage', () => {
    expect(parseColor('rgb(foo%, 0, 0)')).toBeNull();
  });
});

describe('parseColor — hsl', () => {
  it('parses hsl(h, s%, l%)', () => {
    expect(parseColor('hsl(0, 0%, 0%)')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseColor('hsl(0, 0%, 100%)')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('parses a pure red at hue 0', () => {
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('parses a pure green at hue 120', () => {
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('parses a pure blue at hue 240', () => {
    expect(parseColor('hsl(240, 100%, 50%)')).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('accepts the space-syntax variant', () => {
    expect(parseColor('hsl(120 100% 50%)')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('accepts deg suffix on the hue', () => {
    expect(parseColor('hsl(120deg, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('wraps negative hues', () => {
    expect(parseColor('hsl(-120, 100%, 50%)')).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('handles hues > 360', () => {
    expect(parseColor('hsl(480, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('produces a known mid-hue (60°/yellow)', () => {
    expect(parseColor('hsl(60, 100%, 50%)')).toEqual({ r: 255, g: 255, b: 0 });
  });

  it('produces a known mid-hue (180°/cyan)', () => {
    expect(parseColor('hsl(180, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 255 });
  });

  it('produces a known mid-hue (300°/magenta)', () => {
    expect(parseColor('hsl(300, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 255 });
  });

  it('produces a light/high-lightness colour (exercises high-L branch)', () => {
    // L = 0.75 > 0.5 hits the `ll + ss - ll*ss` branch in the HSL formula.
    expect(parseColor('hsl(0, 100%, 75%)')).toEqual({ r: 255, g: 128, b: 128 });
  });

  it('produces a dark/low-lightness colour (exercises low-L branch)', () => {
    // L = 0.25 < 0.5 hits the `ll * (1 + ss)` branch in the HSL formula.
    expect(parseColor('hsl(0, 100%, 25%)')).toEqual({ r: 128, g: 0, b: 0 });
  });

  it('handles zero saturation (grey)', () => {
    expect(parseColor('hsl(123, 0%, 25%)')).toEqual({ r: 64, g: 64, b: 64 });
  });

  it('rejects missing % on saturation or lightness', () => {
    expect(parseColor('hsl(0, 100, 50%)')).toBeNull();
    expect(parseColor('hsl(0, 100%, 50)')).toBeNull();
  });

  it('rejects non-numeric channels', () => {
    expect(parseColor('hsl(foo, 100%, 50%)')).toBeNull();
    expect(parseColor('hsl(0, bar%, 50%)')).toBeNull();
  });

  it('rejects a missing channel', () => {
    expect(parseColor('hsl(0, 100%)')).toBeNull();
  });

  it('rejects malformed (no parens)', () => {
    expect(parseColor('hsl 0 0% 0%')).toBeNull();
  });
});

describe('parseColor — fallthrough', () => {
  it('returns null for empty string', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor('   ')).toBeNull();
  });

  it('returns null for named colors (not supported)', () => {
    expect(parseColor('red')).toBeNull();
  });

  it('returns null for non-string input', () => {
    // biome-ignore lint/suspicious/noExplicitAny: intentionally passing wrong type to test guard
    expect(parseColor(42 as any)).toBeNull();
    // biome-ignore lint/suspicious/noExplicitAny: intentionally passing wrong type to test guard
    expect(parseColor(null as any)).toBeNull();
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
  });

  it('is 1 for white', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });

  it('uses the linear branch for low channel values', () => {
    // A very small channel value falls in the `s <= 0.03928` branch.
    expect(relativeLuminance({ r: 5, g: 5, b: 5 })).toBeGreaterThan(0);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeCloseTo(21, 5);
  });

  it('is 1 for equal colors', () => {
    const ratio = contrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 });
    expect(ratio).toBe(1);
  });

  it('is symmetric under argument order', () => {
    const a = { r: 119, g: 119, b: 119 };
    const b = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it('yields ~4.48 for #777 on white (known vector, below AA)', () => {
    const ratio = contrastRatio({ r: 0x77, g: 0x77, b: 0x77 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeGreaterThan(4.4);
    expect(ratio).toBeLessThan(4.5);
  });
});

describe('wcagLevel', () => {
  it('returns AAA at ratio ≥ 7 (normal text)', () => {
    expect(wcagLevel(7)).toBe('AAA');
    expect(wcagLevel(21)).toBe('AAA');
  });

  it('returns AA at ratio ≥ 4.5 but < 7 (normal text)', () => {
    expect(wcagLevel(4.5)).toBe('AA');
    expect(wcagLevel(6.99)).toBe('AA');
  });

  it('returns fail below 4.5 (normal text)', () => {
    expect(wcagLevel(4.49)).toBe('fail');
    expect(wcagLevel(1)).toBe('fail');
  });

  it('relaxes thresholds for large text', () => {
    expect(wcagLevel(4.5, true)).toBe('AAA');
    expect(wcagLevel(3, true)).toBe('AA');
    expect(wcagLevel(2.99, true)).toBe('fail');
  });
});
