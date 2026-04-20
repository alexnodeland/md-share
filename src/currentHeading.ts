export interface HeadingPosition {
  id: string;
  top: number;
}

export const getCurrentHeading = (
  headings: readonly HeadingPosition[],
  scrollTop: number,
  offset = 0,
): string | null => {
  let current: string | null = null;
  for (const h of headings) {
    if (h.top <= scrollTop + offset) current = h.id;
    else break;
  }
  return current;
};
