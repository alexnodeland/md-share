let timer: number | undefined;

export const showToast = (message: string, success = false): void => {
  // Not getElementById: a rendered heading like "## Toast" gets id="toast" and
  // precedes the real element in document order.
  const toast = document.querySelector<HTMLElement>('body > #toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast visible${success ? ' success' : ''}`;
  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    toast.className = 'toast';
  }, 2200);
};
