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
