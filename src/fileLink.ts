/**
 * A document opened from (or saved to) a file on disk, so Ctrl+S writes it
 * back. `saved` is what the file holds now, to tell whether edits are pending.
 */
export interface FileLink {
  name: string;
  saved: string;
}

export const isDirty = (link: FileLink, current: string): boolean => link.saved !== current;

/** The editor-header chip: the file name, marked while edits are unsaved. */
export const fileLinkLabel = (
  link: FileLink,
  current: string,
  saveShortcut: string,
): { text: string; title: string } =>
  isDirty(link, current)
    ? { text: `${link.name} •`, title: `Unsaved changes — save to ${link.name} (${saveShortcut})` }
    : { text: link.name, title: `Saved to ${link.name}` };
