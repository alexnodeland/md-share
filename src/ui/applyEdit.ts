import type { EditResult } from '../editorCommands.ts';

export const applyEdit = (textarea: HTMLTextAreaElement, r: EditResult): void => {
  textarea.value = r.value;
  textarea.selectionStart = r.start;
  textarea.selectionEnd = r.end;
  textarea.dispatchEvent(new Event('input'));
};
