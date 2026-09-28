import { escapeHtml } from './escapeHtml.ts';
import { SOFT_URL_LENGTH } from './share.ts';

/**
 * Longest share URL offered as a QR code. The format tops out near 2,950
 * bytes, but past ~2,000 the modules get too dense for a phone camera to
 * read off a laptop screen — the same point the share dialog starts warning.
 */
export const QR_MAX_URL_LENGTH = SOFT_URL_LENGTH;

/** The spec asks for four light modules around the code. */
const QUIET_ZONE = 4;

export const fitsInQr = (url: string): boolean => url.length <= QR_MAX_URL_LENGTH;

const TARGET_PX = 300;
const MIN_PX_PER_MODULE = 3;
const MAX_PX_PER_MODULE = 6;

/**
 * Display size in CSS px: a whole number of pixels per module, at least 3.
 * Fractional scaling blurs module edges and decoders then fail (2.5 px/module
 * didn't scan where 3 did), and 2 px/module failed on some dense codes. The
 * densest code we offer (2,000 chars, 157 modules) is 471 px — it still fits
 * the share dialog.
 */
export const qrDisplaySize = (modules: number): number => {
  const perModule = Math.floor(TARGET_PX / modules);
  return modules * Math.min(MAX_PX_PER_MODULE, Math.max(MIN_PX_PER_MODULE, perModule));
};

/** One path for all dark modules, with horizontal runs merged into single rects. */
export const qrPath = (modules: readonly (readonly boolean[])[]): string => {
  const parts: string[] = [];
  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (row[x]) x++;
      const w = x - start;
      parts.push(`M${start} ${y}h${w}v1h-${w}z`);
    }
  });
  return parts.join('');
};

/**
 * Always dark-on-white regardless of theme: scanners expect it, and many
 * fail on inverted codes.
 */
export const qrSvg = (modules: readonly (readonly boolean[])[], label: string): string => {
  const n = modules.length;
  const size = n + QUIET_ZONE * 2;
  const px = qrDisplaySize(size);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-${QUIET_ZONE} -${QUIET_ZONE} ${size} ${size}" role="img" aria-label="${escapeHtml(label)}" shape-rendering="crispEdges"><rect x="-${QUIET_ZONE}" y="-${QUIET_ZONE}" width="${size}" height="${size}" fill="#fff"/><path fill="#000" d="${qrPath(modules)}"/></svg>`;
};
