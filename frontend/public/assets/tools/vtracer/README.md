# VTracer (WASM) integration

This folder hosts the official VisionCortex VTracer web engine that the app loads at runtime.

Required files (kept):

- web/vtracer_web.js
- web/vtracer_web_bg.wasm

Removed/unused legacy copies (safe to delete if present):

- vtracer_minimal.js, vtracer_minimal.wasm
- vtracer.js, vtracer_final.js, vtracer_clean.js, vtracer_browser.js
- npm/*

Worker integration
- The app worker `src/vtrace/vtracerWorker.ts` dynamically imports `/assets/tools/vtracer/web/vtracer_web.js` and initializes it with the sibling wasm.
- The public test worker at `public/workers/vtracer-worker.js` does the same for static test pages.

Troubleshooting
- Ensure both files resolve under:
  - /assets/tools/vtracer/web/vtracer_web.js
  - /assets/tools/vtracer/web/vtracer_web_bg.wasm
- The glue is patched to provide `env.now` for browsers; if you replace it, keep that patch.