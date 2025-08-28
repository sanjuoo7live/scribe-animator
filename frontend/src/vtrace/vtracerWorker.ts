// Web Worker: VTracer WASM integration (official web build only)
// Expected assets under: /public/assets/tools/vtracer/web/
//  - vtracer_web.js
//  - vtracer_web_bg.wasm

export {}; // Make this a module

type TraceRequest = {
  imageData: ImageData;
  options?: Record<string, any>;
};
type TraceResponse = { paths: string[]; svg?: string; warnings?: string[] };

const VTRACER_BASE = '/assets/tools/vtracer/';

// Store the VTracer module once loaded
let vtracerModule: any = null;

async function loadVTracer(): Promise<{ api: any; source: 'official' }> {
  if (vtracerModule) {
  return { api: vtracerModule, source: 'official' };
  }

  const origin = (globalThis as any).location?.origin || '';
  // 1) Official web build
  try {
    const moduleUrl = origin + VTRACER_BASE + 'web/vtracer_web.js';
    const wasmUrl = origin + VTRACER_BASE + 'web/vtracer_web_bg.wasm';
    console.log('🔍 VTracer Worker: Importing official web build', moduleUrl);
    const modWeb: any = await import(/* webpackIgnore: true */ moduleUrl);
    if (typeof modWeb?.default === 'function') {
      await modWeb.default(wasmUrl);
    } else if (typeof modWeb?.init === 'function') {
      await modWeb.init(wasmUrl);
    }
  const apiWeb = (modWeb && typeof modWeb.convert_image_to_svg === 'function') ? modWeb
        : (modWeb?.default && typeof modWeb.default.convert_image_to_svg === 'function') ? modWeb.default
        : modWeb;
    if (typeof apiWeb?.convert_image_to_svg !== 'function') {
      throw new Error('convert_image_to_svg not found on official module');
    }
  vtracerModule = apiWeb;
    console.log('✅ VTracer Worker: Official engine ready');
    return { api: vtracerModule, source: 'official' };
  } catch (e) {
    console.error('❌ Official engine failed to initialize:', (e as any)?.message || e);
    throw e;
  }
}

function extractPathsFromSvg(svg: string): string[] {
  const paths: string[] = [];
  const re = /<path[^>]*d=["']([^"']+)["'][^>]*>/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) paths.push(m[1]);
  return paths;
}

// Note: No demo-parity clamps or heuristics. We call convert_image_to_svg directly with provided options.

// eslint-disable-next-line no-restricted-globals
(globalThis as any).addEventListener('message', async (ev: MessageEvent<TraceRequest>) => {
  try {
    const { imageData, options = {} } = ev.data;
    const { data: pixels, width, height } = imageData;
    const imageBytes = new Uint8Array(pixels);

    const loaded = await loadVTracer();
    const v = loaded.api;
    if (typeof v?.convert_image_to_svg !== 'function') {
      throw new Error('convert_image_to_svg not found on module');
    }

    // Direct pass-through with sane defaults matching CLI defaults
    const requestedMode = options.mode ?? 'spline';
    const modeResolved = requestedMode === 'pixel' ? 'none' : requestedMode;
    const res = v.convert_image_to_svg(
      imageBytes,
      width,
      height,
      options.color_precision ?? 6,
      options.filter_speckle ?? 4,
      options.layer_difference ?? 16,
      options.corner_threshold ?? 60,
      options.length_threshold ?? 4.0,
      options.splice_threshold ?? 45,
      modeResolved,
      options.hierarchical ?? 'stacked'
    );

    const svg = res?.svg_data;
    const paths = typeof svg === 'string' ? extractPathsFromSvg(svg).slice(0, 800) : [];
    // @ts-ignore
    (globalThis as any).postMessage({ paths, svg } as TraceResponse);
  } catch (e: any) {
    // @ts-ignore
    (globalThis as any).postMessage({ paths: [], error: e?.message || String(e) });
  }
});
