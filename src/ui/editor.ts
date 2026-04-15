const RENDER_DEBOUNCE_MS = 180;

export interface EditorDeps {
  onChange: () => void;
}

export const initEditor = ({ onChange }: EditorDeps): void => {
  const editor = document.getElementById('editor') as HTMLTextAreaElement | null;
  if (!editor) return;

  let debounceTimer: number | undefined;
  const scheduleChange = () => {
    if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(onChange, RENDER_DEBOUNCE_MS);
  };

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      editor.value = `${editor.value.substring(0, s)}  ${editor.value.substring(editor.selectionEnd)}`;
      editor.selectionStart = editor.selectionEnd = s + 2;
      scheduleChange();
    }
  });

  editor.addEventListener('input', scheduleChange);
};
