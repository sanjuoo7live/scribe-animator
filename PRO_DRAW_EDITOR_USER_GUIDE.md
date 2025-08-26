# Scribe Animator – Pro Draw Editor & Draw Path Guide

This guide explains how to create professional “draw‑in” animations with node‑based paths, curved smoothing, and realistic hand/pen tools, plus how to fine‑tune offsets and scales.

## What you can do
- Draw image reveal animations (scratch‑off mask that reveals your image along a path).
- Use the Pro Draw Editor for precise path creation and editing.
- Choose hand/pen image assets that follow and rotate along the path tangent.
- Insert nodes mid‑segment, toggle corner/smooth nodes, smooth curves, and manage multiple paths with ordering.

---

## Quick start

1) Start backend (serves uploads at http://localhost:3001)
- Runs from `backend/server.js` (Node). If not already running, start it from your terminal.

2) Start frontend (React)
- The dev server runs on port 3000/3002. If not running, start from the `frontend` folder.

3) Open the app in your browser
- Navigate to the frontend URL printed in your terminal (for example, http://localhost:3002).

4) Create or open a project, then open Custom Assets from the UI sidebar/panel.

---

## Working with Custom Assets

- Upload images (PNG/JPG/GIF/SVG, up to 5MB). They’ll appear in the Custom Assets grid.
- Click the thumbnail to add the image to the canvas.
- Hover an asset for tools:
  - ✏️ Draw Path Editor (basic)
  - ★ Pro Draw Editor (advanced)
  - × Delete asset

Tip: You can also add YouTube/Instagram embeds via the URL box above the grid.

---

## Basic Draw Path Editor (✏️)

- Draw freehand to create a path that reveals the selected asset image.
- Zoom/pan, auto‑trace region (edge sensitivity), and save/load per‑asset paths.
- Choose a pen type and an optional hand; click “Add Path to Canvas” to add an animated draw path object.

If you only need simple freehand paths and reveal, use this editor.

---

## Pro Draw Editor (★) – Overview

Open from Custom Assets by clicking ★ on an image. The editor opens with:

- Left (canvas): Your image and current paths.
- Top toolbar:
  - Add Nodes: Click to place nodes in sequence.
  - Freehand: Click and drag to draw a polyline (auto‑simplified).
  - Live Preview: Toggle a small tool preview.
  - Insert Node: When enabled, clicking the path inserts a node on the nearest segment.
  - Pan: Toggle to drag the canvas. Tip: Hold Space to pan temporarily.
- Right (inspector):
  - Paths list: Rename, re‑order (↑/↓), Close toggle, Width/Color, select & edit, delete.
  - Global controls: Width, Color, Smoothing (tension slider).
  - Per‑path Bezier: Toggle to render with smoothing (uses current tension).
  - Hand/Pen: Choose pen type, hand variant, offsets, and scales.
  - Reset All: Clears all paths and restores default settings for the editor.
  - Save & Apply: Exports to a drawPath object on the main canvas.

---

## Path editing (Pro)

- Add nodes: Choose “Add Nodes”, click to place points sequentially.
- New Path: Click “New Path” (toolbar) or “＋ New” (Paths) to start the next letter as a separate path.
- Move nodes: Drag a node handle.
- Delete node: Double‑click a node.
- Insert node: Enable “Insert Node”, then click near a segment to insert a node at the closest point on that segment.
- Node type toggle: Shift‑click a node to toggle Corner (blue) ↔ Smooth (green) styling.
- Freehand: Switch to “Freehand”, drag; the path is simplified and added as a new path.
- Bezier (smoothing): In the path card, enable “Bezier” to apply smoothing; control smoothness with Global “Smoothing” slider.
- Segment edits (basic):
  - Delete Segment: With a node selected, removes the next point to shorten the next segment.
  - Merge: With a node selected, removes that node to merge adjacent segments.
- Order & close: Use ↑/↓ to reorder paths; toggle “Close” to connect the last point to the first.

Multi‑letter tip: Use one path per letter. Hit “New Path” before placing the first node of each new letter so points don’t connect to the previous letter.

When done, click “Save & Apply” to add a single drawPath object to the canvas, flattening your paths in order.

---

## Animation on the Canvas

- The drawPath object uses a mask‑based reveal so your image appears along the path.
- During drawIn animation, a pen and optional hand image follow the path head and rotate along the tangent.
- Selection shows a dashed outline of the path’s bounding box.

You can move/scale/rotate the drawPath group like any other object on the canvas.

---

## Hand & Pen tools

The canvas renders real images for tools:

- Pen types
  - pen (default), pencil, marker, brush
  - Files: `frontend/public/assets/tools/pen.svg`, `pencil.svg`, `marker.svg`, `brush.svg`

- Hand variants
  - right‑light, right‑medium, right‑dark, left‑light, left‑medium, left‑dark
  - Files: `frontend/public/assets/tools/hand-<left|right>-<tone>.svg`

- Offsets & Scales (Pro Draw Editor)
  - Hand Offset (X/Y): shifts the hand relative to the draw head point.
  - Hand Scale: scales the hand image.
  - Pen Offset (X/Y): shifts the pen.
  - Pen Scale: scales the pen image.

Tip: Replace the provided SVGs with your own art. Keep filenames and dimensions similar to maintain alignment.

---

## Keyboard shortcuts

- D: Toggle Draw mode (basic canvas pen tool).
- V or Escape: Select mode / stop drawing.
- Pro Draw Editor
  - Shift + Click node: Toggle Corner/Smooth.
  - Double‑click node: Delete node.
  - Insert Node toggle: Click near a segment to insert a node on it.
  - Hold Space: Temporarily enable Pan; drag to move the view when zoomed.
  - Reset All button: Quickly wipe paths and restore defaults if you want to start fresh.

---

## Object properties (reference)

The drawPath object placed on the canvas includes:

- type: `drawPath`
- x, y, width, height: bounds of the revealed image
- animationType: usually `drawIn`
- properties:
  - points: Array<{ x, y }> used for reveal path
  - strokeColor: hex color for the (fallback) line
  - strokeWidth: numeric width
  - assetSrc: image URL to reveal
  - selectedPenType: `pen` | `pencil` | `marker` | `brush`
  - selectedHandAsset: one of `right-light`, `right-medium`, `right-dark`, `left-light`, `left-medium`, `left-dark` or `none`
  - handRotation: boolean (true = rotate along tangent)
  - handOffset: { x, y } (optional)
  - handScale: number (optional)
  - penOffset: { x, y } (optional)
  - penScale: number (optional)

These are consumed in `CanvasEditor` to render the mask and the moving tools with rotation.

---

## Tips & best practices

- Curve control: Use Bezier (smoothing) for elegant handwriting‑like strokes. Tension around 0.3–0.6 often looks natural.
- Spacing between multiple paths: Pro Draw Editor concatenates multiple paths with a tiny point gap so the tool subtly “lifts”.
- Hand orientation: Use left/right variants to match the desired direction of travel.
- Alignment: Fine‑tune hand/pen offsets/scales so the tip aligns exactly with the revealed line.

---

## Troubleshooting

- Tool images don’t appear
  - Ensure the drawPath is using `animationType: drawIn` and you have a valid `assetSrc`.
  - In Pro Draw Editor, select a pen type; choose a Hand Variant if you want a hand.

- Path reveals but no image
  - Confirm the asset image URL is valid and reachable (backend running on 3001).

- Smoothing not applied
  - Make sure the path’s “Bezier” toggle is on and the Global “Smoothing” slider is > 0.

- Hand is misaligned or too large
  - Adjust Hand Offset (X/Y) and Hand Scale in Pro Draw Editor. Similarly adjust Pen Offset/Scale.
  - If things feel messy, use Reset All to start clean.

---

## Where things live

- Pro Draw Editor component
  - `frontend/src/components/ProDrawEditor.tsx`
- Canvas rendering and animation
  - `frontend/src/components/CanvasEditor.tsx`
- Hand & pen art assets
  - `frontend/public/assets/tools/*.svg`

Replace SVGs or add more variants to customize the visual style.

---

## Roadmap (advanced)

- True cubic Bezier handles with per‑node control points.
- Per‑segment tension/width; pause points and variable speeds.
- SVG path import; robust bitmap auto‑trace; eraser and morph tools.

If you need any of these next, they can be added incrementally.
