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

function clampForWasm(imageData: ImageData, maxDim = 1024): ImageData {
  const { width: w, height: h } = imageData;
  if (w <= maxDim && h <= maxDim) return imageData;
  const scale = Math.min(maxDim / w, maxDim / h, 1);
  if (scale >= 1) return imageData;
  
  try {
    const src = new OffscreenCanvas(w, h);
    const sctx = src.getContext('2d') as any;
    if (!sctx) return imageData;
    sctx.putImageData(imageData, 0, 0);
    const nw = Math.max(1, Math.floor(w * scale));
    const nh = Math.max(1, Math.floor(h * scale));
    const dst = new OffscreenCanvas(nw, nh);
    const dctx = dst.getContext('2d') as any;
    if (!dctx) return imageData;
    dctx.drawImage(src, 0, 0, nw, nh);
    return dctx.getImageData(0, 0, nw, nh);
  } catch {
    return imageData;
  }
}

function upscaleSmall(imageData: ImageData, minDim = 8): ImageData {
  const { width: w, height: h } = imageData;
  if (w >= minDim && h >= minDim) return imageData;
  const scale = Math.max(minDim / w, minDim / h);
  const nw = Math.max(1, Math.floor(w * scale));
  const nh = Math.max(1, Math.floor(h * scale));
  try {
    const src = new OffscreenCanvas(w, h);
    const sctx = src.getContext('2d') as any;
    if (!sctx) return imageData;
    sctx.putImageData(imageData, 0, 0);
    const dst = new OffscreenCanvas(nw, nh);
    const dctx = dst.getContext('2d') as any;
    if (!dctx) return imageData;
    // nearest-neighbor like upscaling to preserve edges
    (dctx as any).imageSmoothingEnabled = false;
    dctx.drawImage(src, 0, 0, nw, nh);
    return dctx.getImageData(0, 0, nw, nh);
  } catch {
    return imageData;
  }
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, (v|0)));
}

function buildNpmConfig(base: any): any {
  // Ensure valid ranges and types to avoid wasm panics
  const cfg: any = {
    hierarchical: base.hierarchical === 'cutout' ? 'cutout' : 'stacked',
    filter_speckle: clampInt(base.filter_speckle ?? 4, 0, 1000),
    color_precision: clampInt(base.color_precision ?? 6, 1, 32),
    gradient_step: clampInt(base.gradient_step ?? 16, 1, 255),
  };
  const mode = (base.mode === 'polygon' || base.mode === 'none') ? base.mode : (base.mode === 'spline' ? 'spline' : 'none');
  cfg.mode = mode;
  if (mode === 'spline') {
    cfg.corner_threshold = clampInt(base.corner_threshold ?? 60, 0, 180);
    // segment_length is a float; keep >= 0.1 and <= 1000
    const seg = Number.isFinite(base.segment_length) ? base.segment_length : (Number.isFinite(base.length_threshold) ? base.length_threshold : 4.0);
    cfg.segment_length = Math.max(0.1, Math.min(1000, +seg));
    cfg.splice_threshold = clampInt(base.splice_threshold ?? 45, 0, 180);
  }
  return cfg;
}

// eslint-disable-next-line no-restricted-globals
(globalThis as any).addEventListener('message', async (ev: MessageEvent<TraceRequest>) => {
  console.log('🚀 VTracer Worker: Received message', {
    imageData: `${ev.data.imageData?.width}x${ev.data.imageData?.height}`,
    options: ev.data.options
  });

  try {
  let { imageData, options } = ev.data;
  const demoCompat = !!options?.demoCompat;
    
    console.log('📏 Original image size:', imageData.width, 'x', imageData.height);
    
  // Protective clamp for high-res images
  // In demo compatibility mode, avoid extra clamping to keep parity
  imageData = demoCompat ? imageData : clampForWasm(imageData, 1024);
  // Also upscale tiny images to prevent WASM edge-case panics
  imageData = upscaleSmall(imageData, 12);
    
    console.log('📏 Clamped image size:', imageData.width, 'x', imageData.height);
    console.log('📊 Image data bytes:', imageData.data.length);
    
    // Load real VTracer WASM
  let v: any;
  let engineSource: 'official' = 'official';
    try {
      console.log('📦 Loading VTracer WASM...');
  const loaded = await loadVTracer();
  v = loaded.api;
  engineSource = loaded.source;
      console.log('✅ VTracer WASM loaded successfully');
    } catch (loadError) {
      console.error('❌ VTracer WASM load failed:', loadError);
      throw new Error(`Real VTracer WASM failed to load: ${(loadError as any)?.message || String(loadError)}`);
    }
    
    const hasConvert = typeof v?.convert_image_to_svg === 'function';
    const hasToSvg = typeof v?.to_svg === 'function';
    if (!hasConvert && !hasToSvg) {
      console.error('❌ No compatible VTracer WASM export found');
      console.log('📋 Available functions:', Object.keys(v));
      throw new Error('Neither convert_image_to_svg nor to_svg found on module');
    }

    // Convert ImageData to raw RGBA bytes
    const { data: pixels, width, height } = imageData;
    const imageBytes = new Uint8Array(pixels);
    
    console.log('🔄 Converted to image bytes:', imageBytes.length, 'bytes for', width, 'x', height);
    
    // Build VTracer options (using real VTracer parameter names)
    const requestedMode = options?.mode || "spline";
    // Map UI 'pixel' to VTracer's 'none' (no simplification) mode
    const modeResolved = requestedMode === 'pixel' ? 'none' : requestedMode;
  const vtracerOptions = {
      color_precision: options?.colorPrecision || options?.color_precision || 6,
      filter_speckle: options?.filterSpeckle || options?.filter_speckle || 4,
      layer_difference: options?.layerDifference || options?.layer_difference || options?.gradientStep || 16,
      // Only apply these when spline is selected; otherwise use conservative defaults
      corner_threshold: modeResolved === 'spline' ? (options?.cornerThreshold || options?.corner_threshold || 60) : 60,
      length_threshold: modeResolved === 'spline' ? (options?.lengthThreshold || options?.length_threshold || options?.segmentLength || 4.0) : 4.0,
      splice_threshold: modeResolved === 'spline' ? (options?.spliceThreshold || options?.splice_threshold || 45) : 45,
      mode: modeResolved,
      hierarchical: options?.hierarchical || "stacked"
    };

    console.log('⚙️ VTracer options:', vtracerOptions);

    let svg: string | null = null;
    
    try {
      console.log('🎯 Starting VTracer conversion...');
      if (hasConvert) {
        const result = v.convert_image_to_svg(
          imageBytes,
          width,
          height,
          vtracerOptions.color_precision,
          vtracerOptions.filter_speckle,
          vtracerOptions.layer_difference,
          vtracerOptions.corner_threshold,
          vtracerOptions.length_threshold,
          vtracerOptions.splice_threshold,
          vtracerOptions.mode,
          vtracerOptions.hierarchical
        );
        console.log('✅ VTracer conversion completed (convert_image_to_svg)');
        svg = result.svg_data;
      } else {
        // First attempt with full config
        const cfgFull: any = buildNpmConfig({
          mode: vtracerOptions.mode,
          hierarchical: vtracerOptions.hierarchical,
          filter_speckle: vtracerOptions.filter_speckle,
          color_precision: vtracerOptions.color_precision,
          gradient_step: vtracerOptions.layer_difference,
          corner_threshold: vtracerOptions.corner_threshold,
          segment_length: vtracerOptions.length_threshold,
          splice_threshold: vtracerOptions.splice_threshold,
        });
        try {
          const svgStr: string = v.to_svg(imageBytes, width, height, cfgFull);
          console.log('✅ VTracer conversion completed (to_svg full)');
          svg = svgStr;
        } catch (e1) {
          console.warn('⚠️ to_svg failed with full config, retrying with minimal none-mode config:', (e1 as any)?.message || e1);
          const cfgMinimal: any = buildNpmConfig({
            mode: 'none',
            hierarchical: vtracerOptions.hierarchical,
            filter_speckle: vtracerOptions.filter_speckle,
            color_precision: vtracerOptions.color_precision,
            gradient_step: vtracerOptions.layer_difference,
          });
          try {
            const svgStr2: string = v.to_svg(imageBytes, width, height, cfgMinimal);
            console.log('✅ VTracer conversion completed (to_svg minimal)');
            svg = svgStr2;
          } catch (e2) {
            console.warn('⚠️ to_svg minimal config also failed, trying none-mode without hierarchical:', (e2 as any)?.message || e2);
            try {
              const cfgNoneBare: any = buildNpmConfig({ mode: 'none', filter_speckle: vtracerOptions.filter_speckle, color_precision: vtracerOptions.color_precision, gradient_step: vtracerOptions.layer_difference });
              delete cfgNoneBare.hierarchical;
              const svgStr3: string = v.to_svg(imageBytes, width, height, cfgNoneBare);
              console.log('✅ VTracer conversion completed (to_svg none bare)');
              svg = svgStr3;
            } catch (e3) {
              console.warn('⚠️ to_svg none bare also failed, falling back to local minimal engine:', (e3 as any)?.message || e3);
            // Force local minimal engine load and run convert
            const loadedLocal = await loadVTracer();
            v = loadedLocal.api;
            engineSource = loadedLocal.source;
            if (typeof v?.convert_image_to_svg !== 'function') throw e2;
            const resLocal = v.convert_image_to_svg(
              imageBytes, width, height,
              vtracerOptions.color_precision,
              vtracerOptions.filter_speckle,
              vtracerOptions.layer_difference,
              60, 4.0, 45,
              'spline', vtracerOptions.hierarchical
            );
            console.log('✅ Local minimal conversion completed');
            svg = resLocal.svg_data;
            }
          }
        }
      }
      if (svg) console.log('📄 SVG length:', svg.length, 'characters');
    } catch (traceError) {
      console.error('❌ VTracer conversion failed:', traceError);
      console.error('🔍 Error details:', {
        name: (traceError as any)?.name,
        message: (traceError as any)?.message,
        stack: (traceError as any)?.stack
      });
      throw new Error(`Real VTracer conversion failed: ${(traceError as any)?.message || String(traceError)}`);
    }

    if (!svg || typeof svg !== 'string') {
      console.error('❌ Invalid SVG result:', typeof svg, svg?.length || 'no length');
      throw new Error(`Real VTracer returned invalid result: ${typeof svg} (expected string SVG)`);
    }

    console.log('🔍 SVG preview:', svg.substring(0, 200));

    let paths = extractPathsFromSvg(svg);
    console.log('🔢 Extracted paths:', paths.length);
    
    if (paths.length === 0) {
      console.warn('⚠️ No paths extracted from SVG');
      console.log('📄 Full SVG for debugging:', svg);
      throw new Error('Real VTracer returned valid SVG but no paths were extracted');
    }
    
    // Cap for safety
    const MAX_PATHS = 800;
    paths = paths.slice(0, MAX_PATHS);
    
    console.log('✅ Success! Returning', paths.length, 'paths');
    
    // @ts-ignore
  (globalThis as any).postMessage({ paths, svg, engine: engineSource } as TraceResponse);
  } catch (e: any) {
    console.error('💥 VTracer Worker Error:', e);
    console.error('🔍 Error stack:', e.stack);
    // @ts-ignore
    (globalThis as any).postMessage({ paths: [], error: `Real VTracer WASM Error: ${e?.message || String(e)}` });
  }
});
