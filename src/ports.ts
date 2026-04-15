export interface Compressor {
  encode(text: string): string;
  decode(text: string): string | null;
}

export interface SpeechUtterance {
  text: string;
  rate: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export interface Synth {
  speak(utterance: SpeechUtterance): void;
  cancel(): void;
  createUtterance(text: string): SpeechUtterance;
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
