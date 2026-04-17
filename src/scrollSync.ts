export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface ScrollSizing {
  scrollHeight: number;
  clientHeight: number;
}

export const computeScrollTarget = (source: ScrollMetrics, target: ScrollSizing): number => {
  const sourceRange = source.scrollHeight - source.clientHeight;
  const targetRange = target.scrollHeight - target.clientHeight;
  if (sourceRange <= 0 || targetRange <= 0) return 0;
  const ratio = Math.min(Math.max(source.scrollTop / sourceRange, 0), 1);
  return ratio * targetRange;
};
