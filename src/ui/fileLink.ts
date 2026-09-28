import { MARKDOWN_PICKER_TYPES } from '../fileKind.ts';
import { type FileLink, fileLinkLabel } from '../fileLink.ts';
import type { DiskFile, FileAccess } from '../ports.ts';
import { detectPlatform, formatShortcut } from '../shortcuts.ts';
import { showToast } from './toast.ts';

export interface FileLinkDeps {
  access: FileAccess;
  editor: HTMLTextAreaElement;
  /** Ctrl+S when no file is linked. */
  onShare: () => void;
  /** File name to offer in Save to file… (e.g. from the title). */
  suggestName: () => string;
}

export interface FileLinkControl {
  /** Tie the document, as it is now, to a file on disk. */
  link(disk: DiskFile): void;
  /** The document was replaced; saving must not overwrite the old file with it. */
  unlink(): void;
}

/**
 * Open-in-place: while a document is tied to a file, a chip in the editor
 * header names it (with • for unsaved edits) and Ctrl+S / a click writes it
 * back. Otherwise Ctrl+S keeps opening the share dialog.
 */
export const initFileLink = (deps: FileLinkDeps): FileLinkControl => {
  const { editor, access } = deps;
  const chip = document.getElementById('file-status') as HTMLButtonElement | null;
  const saveAsButton = document.getElementById('btn-save-file');
  const shortcut = formatShortcut('Mod+S', detectPlatform(navigator.platform));
  let disk: DiskFile | null = null;
  let link: FileLink | null = null;

  const refresh = () => {
    if (!chip) return;
    chip.hidden = !link;
    if (!link) return;
    const { text, title } = fileLinkLabel(link, editor.value, shortcut);
    chip.textContent = text;
    chip.title = title;
    chip.setAttribute('aria-label', title);
  };

  const save = async () => {
    if (!disk || !link) return;
    const text = editor.value;
    try {
      await disk.write(text);
      link.saved = text;
      refresh();
      showToast(`Saved ${link.name}`, true);
    } catch {
      showToast(`Could not save ${link.name} — it may have moved, or permission was denied`);
    }
  };

  const control: FileLinkControl = {
    link: (next) => {
      disk = next;
      link = { name: next.name, saved: editor.value };
      refresh();
    },
    unlink: () => {
      disk = null;
      link = null;
      refresh();
    },
  };

  const saveAs = async () => {
    try {
      const next = await access.saveAs(deps.suggestName(), MARKDOWN_PICKER_TYPES);
      if (!next) return;
      control.link(next);
      await save();
    } catch {
      showToast('Could not save the file');
    }
  };

  if (saveAsButton) {
    saveAsButton.hidden = !access.supported;
    saveAsButton.addEventListener('click', () => void saveAs());
  }
  chip?.addEventListener('click', () => void save());
  editor.addEventListener('input', refresh);
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 's') return;
    e.preventDefault();
    if (link) void save();
    else deps.onShare();
  });
  return control;
};
