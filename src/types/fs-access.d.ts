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

// "Open with → md-share" for the installed app (manifest file_handlers).
interface LaunchParams {
  readonly files: readonly FileSystemHandle[];
}

interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void;
}

interface Window {
  launchQueue?: LaunchQueue;
}
