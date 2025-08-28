// Lightweight wrapper for MediaPipe Selfie Segmentation run on main thread.
// Loads script from /public/assets/tools/mediapipe/selfie_segmentation.js if present.

export type MPOptions = {
  modelSelection?: 0 | 1; // 0 general, 1 landscape/full-body
  basePath?: string; // default: '/assets/tools/mediapipe/'
  featherPx?: number; // edge feathering for mask
};

declare global {
  interface Window {
    SelfieSegmentation?: any;
  }
}

let mpLoaded = false;
let mpLoading: Promise<void> | null = null;

export async function ensureMediaPipeLoaded(basePath = '/assets/tools/mediapipe/') {
  if (mpLoaded) return;
  if (mpLoading) return mpLoading;
  mpLoading = new Promise<void>((resolve, reject) => {
    try {
      if (window.SelfieSegmentation) { mpLoaded = true; resolve(); return; }
      const tryLoad = (src: string) => new Promise<boolean>((res) => {
        const s = document.createElement('script');
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.src = src;
        s.onload = () => res(!!window.SelfieSegmentation);
        s.onerror = () => res(false);
        document.head.appendChild(s);
      });
      const CDN_MAIN = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/selfie_segmentation.js';
      (async () => {
        // Try local first
        let ok = await tryLoad(`${basePath}selfie_segmentation.js`);
        if (!ok) ok = await tryLoad(CDN_MAIN);
        if (!ok) return reject(new Error('Failed to load MediaPipe Selfie Segmentation. Tried local and CDN.'));
        mpLoaded = true;
        resolve();
      })();
    } catch (e) { reject(e as any); }
  });
  return mpLoading;
}

export async function segmentImageDataWithMediaPipe(imageData: ImageData, opts: MPOptions = {}): Promise<ImageData> {
  const basePath = opts.basePath ?? '/assets/tools/mediapipe/';
  await ensureMediaPipeLoaded(basePath);

  if (!window.SelfieSegmentation) throw new Error('MediaPipe SelfieSegmentation not available');
  // MediaPipe expects HTML canvas/image input; run on main thread
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.putImageData(imageData, 0, 0);

  // Use CDN for dependent assets to avoid local 404s returning index.html ("Unexpected token '<'")
  const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/';
  const locateFile = (file: string) => {
    // Route known dependency files to CDN; keep custom overrides if basePath is http(s)
    const isRemoteBase = /^https?:\/\//i.test(basePath);
    if (isRemoteBase) return `${basePath}${file}`;
    // These files are requested by selfie_segmentation.js at runtime
    if (
      /selfie_segmentation_solution_(simd_)?wasm_bin\.js$/i.test(file) ||
      /\.wasm$/i.test(file) ||
      /selfie_segmentation(_landscape)?\.tflite$/i.test(file) ||
      /selfie_segmentation\.binarypb$/i.test(file)
    ) {
      return `${CDN_BASE}${file}`;
    }
    return `${basePath}${file}`;
  };

  const selfie = new window.SelfieSegmentation({ locateFile });
  selfie.setOptions({ modelSelection: opts.modelSelection ?? 1 });
  // Important: initialize before sending frames
  await selfie.initialize();

  const segMask: HTMLCanvasElement = await new Promise((resolve, reject) => {
    try {
      selfie.onResults((results: any) => {
        // results.segmentationMask is an HTMLCanvasElement
        resolve(results.segmentationMask as HTMLCanvasElement);
      });
      // Fire
      // @ts-ignore
      selfie.send({ image: canvas });
    } catch (e) { reject(e); }
  });

  // Best-effort cleanup of internal resources
  try { await selfie.close(); } catch {}

  // Compose original RGBA with mask -> destination-in
  const out = document.createElement('canvas');
  out.width = imageData.width; out.height = imageData.height;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('No 2D context');
  octx.drawImage(canvas, 0, 0);

  // Optional feathering (blur the mask edges)
  const feather = Math.max(0, Math.min(20, opts.featherPx ?? 2));
  if (feather > 0) octx.filter = `blur(${feather}px)`;
  octx.globalCompositeOperation = 'destination-in';
  octx.drawImage(segMask, 0, 0);
  octx.globalCompositeOperation = 'source-over';
  octx.filter = 'none';

  return octx.getImageData(0, 0, out.width, out.height);
}
