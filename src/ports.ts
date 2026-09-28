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
