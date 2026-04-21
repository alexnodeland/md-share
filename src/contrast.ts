// Pure WCAG contrast utilities. No DOM access — `parseColor` is string-only.

export type Rgb = { r: number; g: number; b: number };

export type WcagLevel = 'AAA' | 'AA' | 'fail';

const clamp255 = (n: number): number => Math.max(0, Math.min(255, n));

const expandShortHex = (hex: string): string =>
  hex
    .split('')
    .map((c) => c + c)
    .join('');

const parseHex = (value: string): Rgb | null => {
  const hex = value.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  let full: string;
  if (hex.length === 3) full = expandShortHex(hex);
  else if (hex.length === 4)
    full = expandShortHex(hex.slice(0, 3)); // ignore alpha
  else if (hex.length === 6) full = hex;
  else if (hex.length === 8)
    full = hex.slice(0, 6); // ignore alpha
  else return null;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return { r, g, b };
};

const parseRgbChannel = (raw: string): number | null => {
  const s = raw.trim();
  if (s.endsWith('%')) {
    const n = Number.parseFloat(s.slice(0, -1));
    if (!Number.isFinite(n)) return null;
    return clamp255(Math.round((n / 100) * 255));
  }
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return clamp255(Math.round(n));
};

const parseRgbFunction = (value: string): Rgb | null => {
  // rgb(r, g, b) | rgba(r, g, b, a) | rgb(r g b / a)
  const open = value.indexOf('(');
  const close = value.lastIndexOf(')');
  if (open < 0 || close <= open) return null;
  const inner = value.slice(open + 1, close);
  // String.split always returns at least one element, so [0] is defined.
  const head = inner.split('/')[0] as string;
  const parts = head.includes(',') ? head.split(',') : head.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  const r = parseRgbChannel(parts[0] as string);
  const g = parseRgbChannel(parts[1] as string);
  const b = parseRgbChannel(parts[2] as string);
  if (r === null || g === null || b === null) return null;
  return { r, g, b };
};

const hueToRgb = (p: number, q: number, tIn: number): number => {
  let t = tIn;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
};

const parseHslFunction = (value: string): Rgb | null => {
  const open = value.indexOf('(');
  const close = value.lastIndexOf(')');
  if (open < 0 || close <= open) return null;
  const inner = value.slice(open + 1, close);
  const head = inner.split('/')[0] as string;
  const parts = head.includes(',') ? head.split(',') : head.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;

  const hRaw = (parts[0] as string).trim().toLowerCase().replace(/deg$/, '');
  const h = Number.parseFloat(hRaw);
  const sRaw = (parts[1] as string).trim();
  const lRaw = (parts[2] as string).trim();
  if (!sRaw.endsWith('%') || !lRaw.endsWith('%')) return null;
  const s = Number.parseFloat(sRaw.slice(0, -1));
  const l = Number.parseFloat(lRaw.slice(0, -1));
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;

  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;

  let r: number;
  let g: number;
  let b: number;
  if (ss === 0) {
    r = g = b = ll;
  } else {
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const p = 2 * ll - q;
    r = hueToRgb(p, q, hh + 1 / 3);
    g = hueToRgb(p, q, hh);
    b = hueToRgb(p, q, hh - 1 / 3);
  }
  return {
    r: clamp255(Math.round(r * 255)),
    g: clamp255(Math.round(g * 255)),
    b: clamp255(Math.round(b * 255)),
  };
};

export const parseColor = (value: string): Rgb | null => {
  if (typeof value !== 'string') return null;
  const s = value.trim().toLowerCase();
  if (s === '') return null;
  if (s.startsWith('#')) return parseHex(s);
  if (s.startsWith('rgb')) return parseRgbFunction(s);
  if (s.startsWith('hsl')) return parseHslFunction(s);
  return null;
};

const channelLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (rgb: Rgb): number => {
  const r = channelLinear(rgb.r);
  const g = channelLinear(rgb.g);
  const b = channelLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};

export const wcagLevel = (ratio: number, isLargeText = false): WcagLevel => {
  const aaa = isLargeText ? 4.5 : 7;
  const aa = isLargeText ? 3 : 4.5;
  if (ratio >= aaa) return 'AAA';
  if (ratio >= aa) return 'AA';
  return 'fail';
};
