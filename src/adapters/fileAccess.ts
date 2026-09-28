import type { DiskFile, FileAccess } from '../ports.ts';

const diskFile = (handle: FileSystemFileHandle): DiskFile => ({
  name: handle.name,
  write: async (text) => {
    const stream = await handle.createWritable();
    await stream.write(text);
    await stream.close();
  },
});

/** Cancelling a picker rejects with AbortError; that's "no file", not a failure. */
const unlessCancelled = async <T>(pick: () => Promise<T>): Promise<T | null> => {
  try {
    return await pick();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
};

export const browserFileAccess: FileAccess = {
  supported: typeof window.showOpenFilePicker === 'function',
  open: (types) =>
    unlessCancelled(async () => {
      const [handle] = await window.showOpenFilePicker!({ types: [...types] });
      return { file: await handle!.getFile(), disk: diskFile(handle!) };
    }),
  saveAs: (suggestedName, types) =>
    unlessCancelled(async () =>
      diskFile(await window.showSaveFilePicker!({ suggestedName, types: [...types] })),
    ),
};
