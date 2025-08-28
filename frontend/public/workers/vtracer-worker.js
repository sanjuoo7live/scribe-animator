// Standalone ESM Worker for testing VTracer from static public pages
// Loads the browser-ready wrapper and wasm from /assets/tools/vtracer/

/* eslint-disable no-restricted-globals */
// In a Worker, 'self' is the global scope; allow its use here.
const G = /** @type {any} */ (self);
const VTRACER_BASE = `${G.location.origin}/assets/tools/vtracer/`;
const MODULE_URL = `${VTRACER_BASE}web/vtracer_web.js`;
const WASM_URL = `${VTRACER_BASE}web/vtracer_web_bg.wasm`;

let vtracerMod = null;

async function loadVTracer() {
  if (vtracerMod) return vtracerMod;
  // Dynamic import inside module worker
  const mod = await import(MODULE_URL);
  if (typeof mod?.default === 'function') await mod.default(WASM_URL);
  else if (typeof mod?.init === 'function') await mod.init(WASM_URL);
  vtracerMod = mod;
  return vtracerMod;
}

function extractPathsFromSvg(svg) {
  const paths = [];
  const re = /<path[^>]*d=["']([^"']+)["'][^>]*>/gim;
  let m;
  while ((m = re.exec(svg))) paths.push(m[1]);
  return paths;
}

G.onmessage = async (e) => {
  try {
    const { imageData, options } = e.data || {};
    if (!imageData || !imageData.data) throw new Error('Missing imageData');

    const { data, width, height } = imageData;
    const bytes = data instanceof Uint8ClampedArray ? new Uint8Array(data) : new Uint8Array(data.buffer || data);

    const v = await loadVTracer();
    if (typeof v?.convert_image_to_svg !== 'function') {
      throw new Error('convert_image_to_svg not found in module');
    }

    const opts = options || {};
    // Pass-through to match wasm signature exactly; 'none' => pixel mode passthrough
    const result = v.convert_image_to_svg(
      bytes,
      width,
      height,
      opts.color_precision ?? opts.colorPrecision ?? 6,
      opts.filter_speckle ?? opts.filterSpeckle ?? 4,
      opts.layer_difference ?? opts.layerDifference ?? opts.gradientStep ?? 16,
      opts.corner_threshold ?? opts.cornerThreshold ?? 60,
      opts.length_threshold ?? opts.lengthThreshold ?? opts.segmentLength ?? 4.0,
      opts.splice_threshold ?? opts.spliceThreshold ?? 45,
      opts.mode ?? 'spline',
      opts.hierarchical ?? 'stacked'
    );

    let svg = result?.svg_data;
    const paths = typeof svg === 'string' ? extractPathsFromSvg(svg).slice(0, 800) : [];
    // If B/W often yields black-on-transparent on dark page, wrap with white background for visibility
    if (typeof svg === 'string') {
      const viewBoxMatch = svg.match(/viewBox="([^"]+)"/i);
      if (viewBoxMatch) {
  const vb = viewBoxMatch[1];
  const [, , w, h] = vb.split(/\s+/).map(Number);
        if (!Number.isNaN(w) && !Number.isNaN(h)) {
          svg = svg.replace('<svg', '<svg style="background:white"');
          // Alternatively, could inject a rect; style is simpler and non-destructive.
        }
      }
    }
    G.postMessage({ paths, svg });
  } catch (err) {
  const msg = (err && (err.message || String(err))) || 'Unknown error';
  G.postMessage({ paths: [], error: msg });
  }
};
