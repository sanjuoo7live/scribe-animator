# Properties Panel Guardrails

This document captures early-phase decisions for the modular properties panel.

## Control ranges & steps
- All editor limits live in `domain/constants.ts`.
- Editors reference these values rather than hard-coding numbers.

## Undo policy
- Object edits create undo entries.
- Normalization uses `silent` updates so selection changes do not churn history.
- A transaction API (`transaction`) is in place for future rAF batching.

## Performance budgets
- Panel render budget: <16ms per interaction.
- Future selectors will be narrowed per editor to avoid unnecessary renders.

## Selection semantics
- Only single-object editing is supported in Phase&nbsp;1.

## SVG-path invariants
- SVG paths default to `drawIn` animation with `linear` easing.
- Hand follower/calibrator will be lazy-loaded to avoid heavy UI.

## Flag policy
- Experimental areas are behind feature flags in `domain/flags.ts` (all default `false`).
- Flags include: hand smoothing, corner lifts, uploads, calibrators.
