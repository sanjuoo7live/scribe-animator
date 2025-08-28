// Minimal wrapper to render an SVG string to a Canvas using @resvg/resvg-wasm (browser)
// Lazily initializes the WASM module from /public/vendor/resvg/index_bg.wasm (copied on postinstall).

let resvgMod: any | null = null;
let resvgReady: Promise<void> | null = null;

async function ensureResvg() {
  if (resvgMod) return resvgMod;
  if (!resvgReady) {
    resvgReady = (async () => {
      // Dynamically import the browser WASM build
      // Note: types are provided via a local d.ts shim.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = await import('@resvg/resvg-wasm');
      // Try local wasm first (copied by scripts/copy-resvg-wasm.js), then CDN fallback
      const localUrl = '/vendor/resvg/index_bg.wasm';
      let ok = false;
      try {
        const r = await fetch(localUrl, { method: 'HEAD' });
        ok = r.ok;
      } catch {}
      const wasmUrl = ok ? localUrl : 'https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm';
      if (typeof (mod as any).initWasm === 'function') {
        await (mod as any).initWasm(fetch(wasmUrl));
      }
      resvgMod = mod;
    })();
  }
  await resvgReady;
  return resvgMod!;
}

export type ResvgRenderOptions = {
  width?: number;
  height?: number;
  fitTo?: {
    mode: 'width' | 'height' | 'zoom' | 'original';
    value?: number;
  };
  background?: string; // e.g. '#ffffff00' for transparent
};

export async function renderSvgToImageData(svg: string, opts: ResvgRenderOptions = {}) {
  const mod = await ensureResvg();
  const ResvgCtor = (mod as any).Resvg;
  const resvg = new ResvgCtor(svg, {
    fitTo: opts.fitTo,
    background: opts.background,
  } as any);

  const pngData = resvg.render();
  const { width, height } = pngData as any;
  // Convert to ImageData consumable by Canvas 2D via PNG decode
  const bytes: Uint8Array = (pngData as any).asPng ? (pngData as any).asPng() : (pngData as unknown as Uint8Array);
  // Use ArrayBuffer slice to avoid ArrayBufferLike type mismatch in DOM typings
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: 'image/png' });
  // Prefer createImageBitmap if available
  const bitmap = typeof createImageBitmap === 'function'
    ? await createImageBitmap(blob)
    : await new Promise<ImageBitmap>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const cx = c.getContext('2d');
            if (!cx) return reject(new Error('2D context not available'));
            cx.drawImage(img, 0, 0);
            // createImageBitmap polyfill via canvas
            // @ts-ignore
            resolve((c as any).transferControlToOffscreen ? (c as any) : (cx.canvas as any));
          } catch (e) { reject(e as any); }
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
  // Draw into a temporary canvas to get ImageData
  const tmp = document.createElement('canvas');
  tmp.width = (bitmap as any).width || width; tmp.height = (bitmap as any).height || height;
  const tctx = tmp.getContext('2d');
  if (!tctx) throw new Error('2D context not available');
  // drawImage handles both ImageBitmap and Canvas-lean fallback
  // @ts-ignore
  tctx.drawImage(bitmap, 0, 0);
  const imageData = tctx.getImageData(0, 0, tmp.width, tmp.height);
  return { imageData, width: tmp.width, height: tmp.height };
}

export async function drawSvgOnCanvas(
  ctx: CanvasRenderingContext2D,
  svg: string,
  opts: ResvgRenderOptions = {}
) {
  const { imageData } = await renderSvgToImageData(svg, opts);
  ctx.putImageData(imageData, 0, 0);
}
