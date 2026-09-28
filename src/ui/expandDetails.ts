/** Opens every collapsed <details> under `root`; returns a function that re-collapses them. */
export const expandDetails = (root: ParentNode): (() => void) => {
  const closed = Array.from(root.querySelectorAll<HTMLDetailsElement>('details:not([open])'));
  for (const d of closed) d.open = true;
  return () => {
    for (const d of closed) d.open = false;
  };
};

/**
 * Print (menu or Ctrl+P) shows folded callouts and expand sections open, so
 * the PDF carries the whole document; the screen state is restored after.
 */
export const initPrintExpansion = (getRoot: () => HTMLElement | null): void => {
  let restore: (() => void) | null = null;
  window.addEventListener('beforeprint', () => {
    const root = getRoot();
    restore = root ? expandDetails(root) : null;
  });
  window.addEventListener('afterprint', () => {
    restore?.();
    restore = null;
  });
};
