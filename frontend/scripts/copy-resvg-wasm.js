/* Copy @resvg/resvg-wasm wasm binary into public so it can be fetched at runtime. */
const fs = require('fs');
const path = require('path');

function copy(src, dest) {
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`[resvg] Copied wasm: ${src} -> ${dest}`);
  } catch (e) {
    console.warn('[resvg] Copy failed:', e && e.message ? e.message : e);
  }
}

try {
  const pkgRoot = path.join(__dirname, '..');
  const src = path.join(pkgRoot, 'node_modules', '@resvg', 'resvg-wasm', 'index_bg.wasm');
  const dest = path.join(pkgRoot, 'public', 'vendor', 'resvg', 'index_bg.wasm');
  if (fs.existsSync(src)) {
    copy(src, dest);
  } else {
    console.warn('[resvg] wasm not found at', src);
  }
} catch (e) {
  console.warn('[resvg] Copy script error:', e && e.message ? e.message : e);
}
