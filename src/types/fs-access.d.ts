// The File System Access pickers (Chromium). lib.dom has the handles but not these.
interface FilePickerOptions {
  types?: { description: string; accept: Record<string, string[]> }[];
  excludeAcceptAllOption?: boolean;
}

interface Window {
  showOpenFilePicker?: (options?: FilePickerOptions) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (
    options?: FilePickerOptions & { suggestedName?: string },
  ) => Promise<FileSystemFileHandle>;
}
