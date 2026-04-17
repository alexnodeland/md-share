export const initHelpModal = (): void => {
  const modal = document.getElementById('help-modal');
  const openBtn = document.getElementById('btn-help');
  const closeBtn = document.getElementById('btn-help-close');
  if (!modal || !openBtn || !closeBtn) return;

  let previousFocus: HTMLElement | null = null;

  const isOpen = () => modal.classList.contains('open');

  const open = () => {
    previousFocus = (document.activeElement as HTMLElement) ?? null;
    modal.classList.add('open');
    closeBtn.focus();
  };

  const close = () => {
    modal.classList.remove('open');
    previousFocus?.focus?.();
    previousFocus = null;
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      close();
      return;
    }
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    if (isOpen()) close();
    else open();
  });
};
