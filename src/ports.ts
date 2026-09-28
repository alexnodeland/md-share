import type { DocModel } from './docModel.ts';
import type { SharedPayload } from './share.ts';

export interface Compressor {
  encode(text: string): Promise<string>;
  decode(text: string): Promise<string | null>;
}

export interface SpeechUtterance {
  text: string;
  rate: number;
  voiceURI: string | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export interface SpeechVoice {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
}

export interface Synth {
  speak(utterance: SpeechUtterance): void;
  cancel(): void;
  createUtterance(text: string): SpeechUtterance;
  getVoices(): SpeechVoice[];
  onVoicesChanged(cb: () => void): () => void;
  isSupported(): boolean;
}

export interface Clipboard {
  write(text: string): Promise<void>;
  /** Formatted copy: rich targets (docs, email) take `html`, plain ones take `text`. */
  writeRich(html: string, text: string): Promise<void>;
}

export interface Printer {
  print(): void;
}

export interface Location {
  origin: string;
  pathname: string;
}

export interface Storage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** Strips script-capable markup from rendered HTML before it reaches the DOM. */
export interface Sanitizer {
  sanitize(html: string): string;
}

/** Converts pasted rich text (HTML) into Markdown. */
export interface HtmlToMarkdown {
  convert(html: string): Promise<string>;
}

/** The OS share sheet (Web Share API). */
export interface NativeShare {
  isAvailable(): boolean;
  share(data: { title: string; url: string }): Promise<void>;
  /** Whether the OS share sheet takes these files (mobile, and some desktops). */
  canShareFiles(files: File[]): boolean;
  shareFiles(data: { title: string; files: File[] }): Promise<void>;
}

export interface DocxImportResult {
  html: string;
  images: number;
  skippedImages: number;
}

/** Reads a Word (.docx) file into HTML, ready for HtmlToMarkdown. */
export interface DocxReader {
  /** `embedImage` turns an image's bytes into a `src`, or null to drop it. */
  toHtml(
    data: ArrayBuffer,
    embedImage: (bytes: Uint8Array, contentType: string) => Promise<string | null>,
  ): Promise<DocxImportResult>;
}

export interface ExportImage {
  data: Uint8Array;
  width: number;
  height: number;
  type: 'png' | 'jpg' | 'gif' | 'bmp';
}

/** Writes the document model as a Word (.docx) file. */
export interface DocxWriter {
  write(
    model: DocModel,
    options: {
      title: string | null;
      /** Bytes and size for an image `src`, or null to fall back to its alt text. */
      image: (src: string) => Promise<ExportImage | null>;
      /** The rendered diagram with this index, or null to fall back to its source. */
      diagram: (index: number) => Promise<ExportImage | null>;
    },
  ): Promise<Blob>;
}

/** Turns images and rendered SVG into bitmap bytes for export formats. */
export interface Rasterizer {
  /** Load an image URL (data:, same-origin, or CORS-enabled). */
  image(src: string): Promise<ExportImage | null>;
  /** Render an inline SVG (e.g. a mermaid diagram) at `scale`× for sharpness. */
  svg(svg: SVGSVGElement, scale: number): Promise<ExportImage | null>;
}

/** A file on disk the document can be written back to. */
export interface DiskFile {
  readonly name: string;
  write(text: string): Promise<void>;
}

export interface FilePickerType {
  description: string;
  accept: Record<string, string[]>;
}

/** File System Access: open a file for editing in place, or pick where to save. */
export interface FileAccess {
  /** False where the browser can't write files (Firefox, Safari): Open… and Download still work. */
  readonly supported: boolean;
  /** Null when the picker is cancelled. */
  open(types: readonly FilePickerType[]): Promise<{ file: File; disk: DiskFile } | null>;
  saveAs(suggestedName: string, types: readonly FilePickerType[]): Promise<DiskFile | null>;
  /** Files the OS opened with the installed app ("Open with → md-share"). */
  onLaunch(handler: (file: File, disk: DiskFile) => void): void;
}

/** What the service worker kept from a share into the installed app (Android "Share → md-share"). */
export interface SharedInbox {
  /** The waiting share, removed as it is read; null when there is none. */
  take(): Promise<SharedPayload | null>;
}
