const closeAllDropdowns = (): void => {
  for (const el of document.querySelectorAll('.dropdown')) {
    el.classList.remove('open');
  }
};

export const initDropdowns = (): void => {
  for (const trigger of document.querySelectorAll<HTMLElement>('[data-dropdown]')) {
    const targetId = trigger.dataset.dropdown;
    if (!targetId) continue;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = document.getElementById(targetId);
      if (!target) return;
      const wasOpen = target.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) target.classList.add('open');
    });
  }

  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    if (t && (t.closest('.dropdown') || t.closest('[data-dropdown]'))) return;
    closeAllDropdowns();
  });
};

export { closeAllDropdowns };
