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
