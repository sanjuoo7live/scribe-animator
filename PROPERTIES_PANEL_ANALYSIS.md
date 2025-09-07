# Properties Panel — Pre-Refactor Analysis

This document captures the current behavior and integration points of the **Properties Panel** prior to refactoring. It serves as a baseline checklist for future work.

## 1. Inventory & Scope
- **Object types** managed by the store: `shape`, `text`, `image`, `drawing`, `drawPath`, `videoEmbed`, `svgPath`【F:frontend/src/store/appStore.ts†L3-L16】
- **Editable fields** exposed in the panel:
  - **Object info**: read-only type and ID【F:frontend/src/components/panels/PropertiesPanel.tsx†L121-L143】
  - **Debug**: toggle renderer logging【F:frontend/src/components/panels/PropertiesPanel.tsx†L146-L165】
  - **Position**: X, Y numeric inputs【F:frontend/src/components/panels/PropertiesPanel.tsx†L167-L189】
  - **Shape size**: width, height for shapes【F:frontend/src/components/panels/PropertiesPanel.tsx†L192-L217】
  - **Shape appearance**: fill, stroke, stroke width with color picker and range slider【F:frontend/src/components/panels/PropertiesPanel.tsx†L219-L260】
  - **Text properties**: text content, font size, color, families, emoji forcing, custom family【F:frontend/src/components/panels/PropertiesPanel.tsx†L266-L337】
  - **Path follow**: enable button, rotate-with-path checkbox, path point editors【F:frontend/src/components/panels/PropertiesPanel.tsx†L341-L424】
  - **Layer order**: bring/send buttons for z-index management【F:frontend/src/components/panels/PropertiesPanel.tsx†L426-L455】
  - **Animation**: start, duration, type, easing selections【F:frontend/src/components/panels/PropertiesPanel.tsx†L457-L517】
  - **SVG draw settings**: advanced draw configuration for `svgPath` via nested component【F:frontend/src/components/panels/PropertiesPanel.tsx†L520-L531】
  - **Hand follower**: enable hand asset, mirror, scale, offsets, smoothing, corner lifts, and custom uploads【F:frontend/src/components/panels/PropertiesPanel.tsx†L534-L939】
- **Feature toggles/flags**:
  - Renderer debug checkbox【F:frontend/src/components/panels/PropertiesPanel.tsx†L146-L165】
  - Hand follower enable toggle, debug overlay, mirror, show foreground, smoothing, corner lifts【F:frontend/src/components/panels/PropertiesPanel.tsx†L534-L939】
- **Side sections**: Object Info, Debug, Position, Size, Appearance, Text, Path Follow, Layer Order, Animation, SVG Draw Settings, Hand Follower.

## 2. API & Data Flow Map
- **Inputs**: selected object ID and project from Zustand store【F:frontend/src/components/panels/PropertiesPanel.tsx†L11-L19】
- **Outputs**: `updateObject`, `moveObjectLayer` dispatch actions【F:frontend/src/components/panels/PropertiesPanel.tsx†L12-L24】【F:frontend/src/components/panels/PropertiesPanel.tsx†L426-L455】
- **Store selectors**: current project, selected object, history via `useAppStore`【F:frontend/src/store/appStore.ts†L39-L65】
- **Store actions**: `updateObject`, `moveObjectLayer`, plus undo/redo utilities【F:frontend/src/store/appStore.ts†L49-L65】
- **Cross-feature dependencies**: Hand asset selector, calibration modal, SVG draw settings, timeline/animation interplay, asset library, color picker, hand follower compositor.

## 3. UX & Parity Matrix
- **Widgets**
  - Numeric inputs for position/size/time.
  - Range sliders for stroke width, font size, hand scale, smoothing, corner lift parameters.
  - Color inputs for fills/strokes.
  - Select menus for animation types/easings, font families.
  - Textarea for text content.
  - Buttons for layer order and path point management.
- **Units & ranges**: positions and sizes in px; angles in degrees; durations in seconds; stroke width 0–20; font size 8–72; smoothing strength 0.05–0.5; corner lift angle 15–60° etc.
- **Derived rules**: SVG paths force linear easing and drawIn animation by default【F:frontend/src/components/panels/PropertiesPanel.tsx†L60-L77】.
- **Live update**: direct `onChange` updates store without debounce; some features (path points) apply immediately.
- **Defaults & reset**: width/height default to 100; stroke width 2; font size 16; SVG draw options derived from `defaultSvgDrawOptions`【F:frontend/src/components/shared/SvgDrawSettings.tsx†L13-L19】.
- **Dynamic sections**: conditional rendering based on `selectedObj.type` and hand follower enablement.

## 4. Validation & Normalization Rules
- Numeric inputs use `min`/`max` attributes (e.g., stroke width 0–20, hand scale 0.5–2). No central schema validation.
- SVG draw options normalized through merge with defaults in `SvgDrawSettings`【F:frontend/src/components/shared/SvgDrawSettings.tsx†L30-L45】.
- Text fields allow free strings; color inputs sanitize via native `<input type="color">`.
- Size/position inputs cast to numbers before updating to avoid strings【F:frontend/src/components/panels/PropertiesPanel.tsx†L172-L186】.

## 5. Responsiveness & Layout
- Uses Tailwind utility classes with responsive grids (`grid-cols-2`, `md:grid-cols-2/3`).
- Panel is scrollable (`overflow-y-auto`) and uses stacked sections; no explicit breakpoints beyond those in imported components.
- No auto-collapse logic beyond conditional rendering.

## 6. Performance Guard Rails
- Updates directly call store setters (`updateObject`, `updateProperty`) with no debounce, so rapid slider changes may flood updates.
- Undo history limited to last 50 states in store to avoid memory blowups【F:frontend/src/store/appStore.ts†L109-L120】.
- No memoization on inputs beyond `React.useCallback`/`useMemo` for animation type calculation.

## 7. Multi-Select Semantics
- Panel operates on a single `selectedObject`; no mixed-value logic or multi-select support.

## 8. Undo/Redo & History
- Every property change goes through `updateObject`, which saves to history for undo/redo via store helpers【F:frontend/src/store/appStore.ts†L109-L120】.
- No batching of slider drags; each change becomes a history entry.

## 9. Accessibility (a11y)
- Basic labels and focusable inputs are present; no ARIA roles or keyboard shortcuts beyond native HTML behavior.

## 10. Internationalization (i18n)
- Strings are hard-coded in English; no localization infrastructure. Units use `px` and seconds implicitly.

## 11. Telemetry & Diagnostics
- No metrics or logging hooks; only optional renderer debug checkbox.

## 12. External Integrations
- Hand asset selection relies on asset library and backend for images【F:frontend/src/components/panels/PropertiesPanel.tsx†L560-L588】.
- SVG draw settings component encapsulates animation tuning for hand-drawn SVG paths【F:frontend/src/components/panels/PropertiesPanel.tsx†L520-L531】.
- Calibration modal and tool selector integrate with hand-following system.

## 13. Edge Cases & Safeguards
- Fields default when undefined (e.g., stroke width default 2).
- Text font family custom override allows fallbacks but no validation.
- Corner lift and smoothing sections guard against missing nested objects by merging defaults.

## 14. Test Baseline (before refactor)
- No dedicated snapshot or interaction tests for the Properties Panel.
- Existing Jest tests in frontend currently fail (see testing section for output). A baseline suite covering each object type is needed.

## 15. Risk Register
- **Hand follower** integration (asset selection, calibration, smoothing, corner lifts) is complex and high risk.
- **SVG draw settings** interacts with animation timing; misconfigurations may desync timeline.
- Undo history accumulation on sliders could degrade performance.

## 16. Acceptance Criteria (post-refactor)
- Maintain feature parity for all object types and properties listed above.
- No regression in undo/redo, animation timing, or hand follower behavior.
- Panel remains responsive and accessible across viewports.
- New tests cover core flows and edge cases.

---
Generated from repository state at commit time; see citations for source references.
