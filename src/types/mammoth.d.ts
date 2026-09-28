declare module 'mammoth' {
  interface MammothImage {
    contentType: string;
    readAsArrayBuffer(): Promise<ArrayBuffer>;
  }
  interface ImageConverter {
    readonly __imageConverter: unique symbol;
  }
  interface ConvertOptions {
    styleMap?: string[];
    convertImage?: ImageConverter;
  }
  interface ConvertResult {
    value: string;
    messages: { type: string; message: string }[];
  }
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer; buffer?: ArrayBuffer },
    options?: ConvertOptions,
  ): Promise<ConvertResult>;
  export const images: {
    imgElement(fn: (image: MammothImage) => Promise<{ src: string; alt?: string }>): ImageConverter;
  };
  const mammoth: { convertToHtml: typeof convertToHtml; images: typeof images };
  export default mammoth;
}
