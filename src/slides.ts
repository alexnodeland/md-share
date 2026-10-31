export const groupBetweenBreaks = (children: readonly Element[]): Element[][] => {
  const groups: Element[][] = [];
  let current: Element[] = [];
  for (const child of children) {
    if (child.tagName === 'HR') {
      if (current.length > 0) groups.push(current);
      current = [];
      continue;
    }
    current.push(child);
  }
  if (current.length > 0) groups.push(current);
  return groups;
};

/** The preview's slides: its top-level blocks between breaks, minus the TOC. */
export const presentableGroups = (children: readonly Element[]): Element[][] =>
  groupBetweenBreaks(children.filter((el) => !el.classList.contains('toc-container')));

/**
 * Three or more slides reads as a deck. One `---` is how essays mark a
 * section break, so two slides alone don't earn a Present button.
 */
export const DECK_MIN_SLIDES = 3;

export const isDeck = (children: readonly Element[]): boolean =>
  presentableGroups(children).length >= DECK_MIN_SLIDES;
