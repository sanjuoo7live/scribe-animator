# SVG Importer Refactor vs Legacy Implementation

The modular importer under `frontend/src/features/svg-import/` mirrors the behaviour of the legacy monolithic `frontend/src/components/core/SvgImporter.legacy.tsx` while carving the logic into smaller layers.

## 1. Line Count & Structure
- **Legacy:** `SvgImporter.legacy.tsx` combined sanitisation, parsing, transforms, validation, hashing, worker orchestration, tracing hooks and a full React UI in a single 2 025‑line file.
- **Refactor:** Domain, infra, app and UI layers span about 930 lines (excluding tests) with a thin shim at `components/SvgImporter.tsx` for backwards compatibility.

### Why fewer lines?
- **Tracing & canvas helpers removed:** bitmap tracing, incremental path‑length measurement and batched canvas object creation remain in the old component but were intentionally left out of the importer feature since they live in separate tracing or rendering modules.
- **UI split across files:** the monolith’s dropzone, preview and error panels accounted for hundreds of lines that are now simple components under `ui/`.
- **Pure functions & reuse:** path sampling and length utilities such as `pathSampler.ts` are imported rather than duplicated, eliminating large helper blocks.
- **Worker orchestration isolated:** progress reporting and cancellation are handled in `useSvgImportFlow` and `svgWorker.ts`, removing inline state and side‑effects.

## 2. Functional Comparison
| Area | Legacy (`SvgImporter.tsx`) | Refactored (`features/svg-import`) |
| --- | --- | --- |
| **Sanitisation** | Inline DOM sanitisation and attribute stripping. | `domain/sanitize.ts` removes scripts, event handlers and external URLs before parsing. |
| **Parsing & Unit Conversion** | Parsing of SVG text interwoven with React state. | `domain/parse.ts` converts raw SVG to a DOM AST and scales all CSS units to pixels. |
| **Path Extraction & Transforms** | Path conversion, `<use>` resolution and transform handling. | `domain/extractPaths.ts` performs shape‑to‑path conversion, resolves `<use>` chains with depth limits and flattens arbitrary transform matrices, including arc to cubic conversion. |
| **Flatten Stage** | Transforms applied during extraction; no explicit stage. | `domain/flatten.ts` is a no‑op for compatibility as transforms are already baked in. |
| **Validation Caps** | Hard caps on elements, commands and tiny‑path filtering. | `domain/validate.ts` enforces element/command caps, removes micro paths, and guards cumulative length. |
| **Color Normalisation & Hashing** | Colours normalised indirectly via canvas preview. | `domain/normalize.ts` canonicalises colours, carries opacity and generates stable hashes. |
| **Path Length & Sampling** | Helpers for length computation and adaptive sampling used for previews. | `validate.ts` measures path lengths for filtering and downstream consumers; sampling utilities remain available in `utils/pathSampler.ts` exactly as before. |
| **Worker Offloading** | Heavy work on main thread. | `infra/svgWorker.ts` runs the pipeline in a web worker and reports progress. |
| **Hook API** | Component owned its side‑effects. | `app/useSvgImportFlow.ts` exposes `start`, `cancel`, progress, result and error state. |
| **UI Components** | Single monolithic panel with dropzone, preview and error handling. | `ui/` folder provides corresponding thin components wired to the new hook. |

## 3. Legacy‑Only Functionality
The original component bundled several concerns that remain outside the refactored importer:
- **Image tracing:** `traceImageDataToPaths` converted bitmaps to paths within the importer.
- **Incremental path-length measurement:** `measureMissingLengthsIncrementally` and `measureSvgLengthsInWorker` used the DOM to lazily compute missing path lengths.
- **Batched canvas insertion:** `createCanvasObjectBatched` added paths to the Konva canvas in slices to keep the UI responsive.
These features have dedicated modules elsewhere and were deliberately excluded from the new importer to keep its responsibilities focused.

## 4. Gap Audit
Earlier reviews flagged several gaps between the legacy importer and the refactor. They are now addressed:

1. **Path transform flattening** – `extractPaths.ts` applies the accumulated matrix to every command, converting arcs to cubic curves so no `transform` attributes remain.
2. **`<use>` handling** – recursive `<use>` references resolve with depth limits and cycle detection, preserving reused shapes.
3. **Sanitisation before parsing** – `sanitize.ts` strips scripts, event handlers, external hrefs, and `<foreignObject>` prior to DOM parsing and preview.
4. **Unit normalisation** – `parse.ts` converts mm/cm/in/pt/pc to pixels with a configurable scale.
5. **Arc transforms** – elliptical arc commands are flattened into cubic Béziers under arbitrary transforms.
6. **Worker offloading** – the entire import pipeline runs in `svgWorker.ts`, keeping the main thread responsive.
7. **Stroke-aware filtering & caps** – `validate.ts` mirrors legacy stroke-aware tiny-path filtering, path-count caps with floor logic, and cumulative length cap semantics.
8. **Canvas adapter & parity tests** – `infra/addToCanvasAdapter.ts` reintroduces batched canvas insertion and timing markers, and parity tests lock behaviour against a golden SVG set.
9. **Separation of concerns** – tracing, preview batching, and canvas helpers remain outside this feature, keeping the importer focused on SVG → path conversion.

## 5. Summary
The refactor preserves SVG import behaviour—sanitisation, parsing, transform flattening, tiny-path filtering and colour normalisation—while shedding tracing and canvas-specific helpers. The smaller, layer-based code totals roughly half the lines of the monolith because only the import pipeline remains inside this feature.
