export type SizeBand = 'green' | 'amber' | 'red';

export interface Limits {
  amber: number;
  red: number;
}

export const DEFAULT_LIMITS: Limits = { amber: 1024, red: 2048 };

export interface Suggestion {
  id: string;
  message: string;
}

export interface ShareSize {
  band: SizeBand;
  bytes: number;
  ratio: number;
  suggestions: Suggestion[];
}

const bandFor = (bytes: number, limits: Limits): SizeBand => {
  if (bytes <= limits.amber) return 'green';
  if (bytes <= limits.red) return 'amber';
  return 'red';
};

const suggestionsFor = (band: SizeBand): Suggestion[] => {
  const out: Suggestion[] = [];
  if (band === 'amber' || band === 'red') {
    out.push({ id: 'strip-images', message: 'Remove embedded base64 images to shrink the URL.' });
  }
  if (band === 'red') {
    out.push({
      id: 'download-md',
      message: 'Download as .md and share the file instead of the URL.',
    });
  }
  return out;
};

export const describeShareSize = (url: string, limits: Limits = DEFAULT_LIMITS): ShareSize => {
  const bytes = url.length;
  const band = bandFor(bytes, limits);
  const ratio = Math.min(1, bytes / limits.red);
  return { band, bytes, ratio, suggestions: suggestionsFor(band) };
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes.toLocaleString()} B`;
  const kb = bytes / 1024;
  return kb >= 10 ? `${Math.round(kb)} KB` : `${kb.toFixed(1)} KB`;
};
