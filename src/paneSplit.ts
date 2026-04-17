export const MIN_SPLIT_RATIO = 0.15;
export const MAX_SPLIT_RATIO = 0.85;
export const DEFAULT_SPLIT_RATIO = 0.5;

export const clampSplitRatio = (ratio: number): number =>
  Math.min(Math.max(ratio, MIN_SPLIT_RATIO), MAX_SPLIT_RATIO);

export const computeSplitRatio = (
  pointerX: number,
  containerLeft: number,
  containerWidth: number,
): number => {
  if (containerWidth <= 0) return DEFAULT_SPLIT_RATIO;
  return clampSplitRatio((pointerX - containerLeft) / containerWidth);
};

export const parseStoredRatio = (value: string | null): number | null => {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return clampSplitRatio(n);
};

export const nudgeRatio = (current: number, delta: number): number =>
  clampSplitRatio(current + delta);
