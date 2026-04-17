const itemsOf = (menu: Element): HTMLElement[] =>
  [...menu.querySelectorAll<HTMLElement>('button, [role="menuitem"], a[href]')].filter(
    (el) => !el.hasAttribute('disabled'),
  );

const setOpen = (trigger: HTMLElement, menu: HTMLElement, open: boolean): void => {
  menu.classList.toggle('open', open);
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
};

const closeAllDropdowns = (): void => {
  for (const el of document.querySelectorAll<HTMLElement>('.dropdown.open')) {
    el.classList.remove('open');
  }
  for (const t of document.querySelectorAll<HTMLElement>('[data-dropdown][aria-expanded="true"]')) {
    t.setAttribute('aria-expanded', 'false');
  }
};

export const initDropdowns = (): void => {
  for (const trigger of document.querySelectorAll<HTMLElement>('[data-dropdown]')) {
    const targetId = trigger.dataset.dropdown;
    if (!targetId) continue;
    const menu = document.getElementById(targetId);
    if (!menu) continue;

    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', targetId);
    menu.setAttribute('role', 'menu');
    for (const item of itemsOf(menu)) item.setAttribute('role', 'menuitem');

    const open = (focusFirst: boolean) => {
      closeAllDropdowns();
      setOpen(trigger, menu, true);
      if (focusFirst) itemsOf(menu)[0]?.focus();
    };

    const close = (returnFocus: boolean) => {
      setOpen(trigger, menu, false);
      if (returnFocus) trigger.focus();
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.contains('open') ? close(false) : open(false);
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(true);
      }
    });

    menu.addEventListener('keydown', (e) => {
      const items = itemsOf(menu);
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? items.indexOf(active) : -1;
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]?.focus();
      } else if (e.key === 'Tab') {
        close(false);
      }
    });

    menu.addEventListener('click', () => close(false));
  }

  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    if (t && (t.closest('.dropdown') || t.closest('[data-dropdown]'))) return;
    closeAllDropdowns();
  });
};

export { closeAllDropdowns };
