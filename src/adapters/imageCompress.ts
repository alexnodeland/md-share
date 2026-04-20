export interface CompressOpts {
  maxDim: number;
  quality: number;
}

export interface CompressedImage {
  dataUrl: string;
  bytes: number;
  originalBytes: number;
}

export type ImageCompressor = (file: File, opts: CompressOpts) => Promise<CompressedImage>;

export const compressImage: ImageCompressor = (file, opts) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w === 0 || h === 0) {
        reject(new Error('image has zero dimensions'));
        return;
      }
      const scale = Math.min(1, opts.maxDim / Math.max(w, h));
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas context unavailable'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tw, th);
      ctx.drawImage(img, 0, 0, tw, th);
      const dataUrl = canvas.toDataURL('image/jpeg', opts.quality);
      const base64 = dataUrl.split(',', 2)[1] ?? '';
      const bytes = Math.floor((base64.length * 3) / 4);
      resolve({ dataUrl, bytes, originalBytes: file.size });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image decode failed'));
    };
    img.src = objectUrl;
  });
