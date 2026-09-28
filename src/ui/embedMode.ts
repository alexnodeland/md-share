/**
 * `#…&e=1`: the document alone, for <iframe> embedding on another site.
 * Chrome, editor, and anything that would edit or fork are hidden; a small
 * link opens the full app in a new tab.
 */
export const initEmbedMode = (editor: HTMLTextAreaElement): void => {
  document.documentElement.dataset.embed = 'true';
  editor.readOnly = true;
  const open = document.getElementById('embed-open') as HTMLAnchorElement | null;
  if (!open) return;
  open.href = window.location.href.replace(/&e=1(?=&|$)/, '');
  open.hidden = false;
};
