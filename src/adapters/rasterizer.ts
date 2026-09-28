import type { ExportImage, Rasterizer } from '../ports.ts';

const load = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src.slice(0, 40)}`));
    img.src = src;
  });

/** Draw to a canvas and read back PNG bytes; null if the canvas is tainted or empty. */
const toPng = async (img: CanvasImageSource, width: number, height: number, scale: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, 'image/png');
    } catch {
      resolve(null); // tainted canvas (cross-origin image without CORS)
    }
  });
  if (!blob) return null;
  const image: ExportImage = {
    data: new Uint8Array(await blob.arrayBuffer()),
    width: Math.round(width),
    height: Math.round(height),
    type: 'png',
  };
  return image;
};

export const browserRasterizer: Rasterizer = {
  image: async (src) => {
    try {
      const img = await load(src);
      return await toPng(img, img.naturalWidth, img.naturalHeight, 1);
    } catch {
      return null;
    }
  },
  svg: async (svg, scale) => {
    try {
      const { width, height } = svg.getBoundingClientRect();
      if (!width || !height) return null;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('width', String(width));
      clone.setAttribute('height', String(height));
      const markup = new XMLSerializer().serializeToString(clone);
      const img = await load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
      return await toPng(img, width, height, scale);
    } catch {
      return null;
    }
  },
};
