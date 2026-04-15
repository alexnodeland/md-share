let timer: number | undefined;

export const showToast = (message: string, success = false): void => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast visible${success ? ' success' : ''}`;
  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    toast.className = 'toast';
  }, 2200);
};
