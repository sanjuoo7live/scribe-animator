/* Copy vtracer-wasm ESM and WASM into public for worker-friendly URL imports */
const fs = require('fs');
const path = require('path');

function copy(src, dst) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return true;
}

try {
  const root = process.cwd();
  // 1) Copy third-party npm package to public/npm
  const fromJs = path.join(root, 'node_modules', 'vtracer-wasm', 'vtracer.js');
  const fromWasm1 = path.join(root, 'node_modules', 'vtracer-wasm', 'vtracer.wasm');
  const fromWasm2 = path.join(root, 'node_modules', 'vtracer-wasm', 'vtracer_bg.wasm');
  const toDir = path.join(root, 'public', 'assets', 'tools', 'vtracer', 'npm');
  const toJs = path.join(toDir, 'vtracer.js');
  // Preserve the filename expected by the ESM import; prefer vtracer.wasm if present
  const wasmSrc = fs.existsSync(fromWasm1) ? fromWasm1 : fromWasm2;
  const wasmName = path.basename(wasmSrc || '');
  const toWasm = path.join(toDir, wasmName || 'vtracer.wasm');

  const okJs = copy(fromJs, toJs);
  const okWasm = wasmSrc ? copy(wasmSrc, toWasm) : false;
  if (okJs && okWasm) {
    console.log(`[copy-vtracer-wasm] Copied vtracer.js and ${wasmName} to public.`);
  } else {
    console.warn('[copy-vtracer-wasm] vtracer-wasm files not found; npm engine may fall back to local.');
  }

  // 2) Copy official VTracer web build to public/web if present
  // when run from frontend/, the official sources live one level up
  const webSrcDir = path.join(root, '..', 'vtracer', 'wasm-lib', 'pkg_web');
  const webJs = path.join(webSrcDir, 'vtracer_web.js');
  const webWasm = path.join(webSrcDir, 'vtracer_web_bg.wasm');
  if (fs.existsSync(webJs) && fs.existsSync(webWasm)) {
    const outDir = path.join(root, 'public', 'assets', 'tools', 'vtracer', 'web');
    const outJs = path.join(outDir, 'vtracer_web.js');
    const outWasm = path.join(outDir, 'vtracer_web_bg.wasm');
    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(webJs, outJs);
    fs.copyFileSync(webWasm, outWasm);
    console.log('[copy-vtracer-wasm] Copied official web build to public/web.');
  } else {
    console.warn('[copy-vtracer-wasm] Official web build (pkg_web) not found; skip.');
  }
} catch (e) {
  console.warn('[copy-vtracer-wasm] Failed:', e && e.message ? e.message : e);
}
