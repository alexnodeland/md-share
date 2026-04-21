declare module 'mammoth/mammoth.browser.min.js' {
  interface MammothMessage {
    type?: string;
    message: string;
  }
  interface MammothResult {
    value: string;
    messages: MammothMessage[];
  }
  interface MammothInput {
    arrayBuffer: ArrayBuffer;
  }
  interface MammothBrowser {
    convertToHtml(input: MammothInput, options?: Record<string, unknown>): Promise<MammothResult>;
    extractRawText(input: MammothInput): Promise<MammothResult>;
  }
  const mammoth: MammothBrowser;
  export default mammoth;
}
