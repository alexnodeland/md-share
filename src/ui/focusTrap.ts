const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab cycling through the modal's controls in DOM order. */
export const trapFocus = (modal: HTMLElement, isOpen: () => boolean): void => {
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !isOpen()) return;
    const items = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.closest('[hidden]'),
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      e.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !modal.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !modal.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  });
};
