import React, { useState, useEffect, useRef } from 'react';
import AssetLibraryPopup from '../panels/AssetLibraryPopup';
import { HandAsset, ToolAsset } from '../../types/handAssets';
import { HandToolCompositor } from '../../utils/handToolCompositor';

interface HandFollowerCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pathData?: string;
  pathMatrix?: number[];
  handAsset: HandAsset;
  toolAsset: ToolAsset;
  initialSettings?: {
    tipBacktrackPx?: number;
    calibrationOffset?: { x: number; y: number };
    nibAnchor?: { x: number; y: number }; // pixel coordinates in hand image
    mirror?: boolean;
    showForeground?: boolean;
    toolRotationOffsetDeg?: number;
    baseScale?: number; // current hand scale at time of calibration
    nibLock?: boolean;
  };
  onApply?: (settings: {
    tipBacktrackPx: number;
    calibrationOffset: { x: number; y: number };
    nibAnchor: { x: number; y: number };
    mirror: boolean;
    showForeground: boolean;
    toolRotationOffsetDeg?: number;
    calibrationBaseScale?: number;
    nibLock?: boolean;
    extraOffset?: { x: number; y: number }; // Add extraOffset for the restored renderer
  }) => void;
  onLiveChange?: (partial: Partial<{
    tipBacktrackPx: number;
    calibrationOffset: { x: number; y: number };
    nibAnchor: { x: number; y: number };
    mirror: boolean;
    showForeground: boolean;
    toolRotationOffsetDeg?: number;
    extraOffset?: { x: number; y: number }; // Add extraOffset for live updates
    nibLock?: boolean;
  }>) => void;
}

const HandFollowerCalibrationModal: React.FC<HandFollowerCalibrationModalProps> = ({
  isOpen,
  onClose,
  pathData,
  pathMatrix,
  handAsset,
  toolAsset,
  initialSettings,
  onApply,
  onLiveChange,
}) => {
  // State for all calibration settings
  const [tipBacktrackPx, setTipBacktrackPx] = useState(initialSettings?.tipBacktrackPx ?? 0);
  const [calibrationOffset, setCalibrationOffset] = useState(
    initialSettings?.calibrationOffset ?? { x: 0, y: 0 }
  );
  const [nibAnchor, setNibAnchor] = useState(() => {
    // Prefer caller-provided default; otherwise compute a sensible default
    // by composing the hand + tool at origin and measuring tip vs hand pos.
    if (initialSettings?.nibAnchor) return initialSettings.nibAnchor;
    try {
      const comp = HandToolCompositor.composeHandTool(
        handAsset,
        toolAsset,
        { x: 0, y: 0 },
        0,
        1
      );
      return {
        x: comp.finalTipPosition.x - comp.handPosition.x,
        y: comp.finalTipPosition.y - comp.handPosition.y,
      };
    } catch {
      return { x: handAsset.gripBase.x, y: handAsset.gripBase.y };
    }
  });
  const [mirror, setMirror] = useState(initialSettings?.mirror ?? false);
  const [toolRotationOffsetDeg, setToolRotationOffsetDeg] = useState<number>(initialSettings?.toolRotationOffsetDeg ?? 0);
  const [nibLock] = useState<boolean>(initialSettings?.nibLock !== false);
  // Removed local Show Foreground control (managed in Properties Panel)
  
  // Force update counter to ensure live changes are reflected
  const [, forceUpdate] = useState(0);
  
  // Preview canvas refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const handImageRef = useRef<HTMLImageElement>(null);
  const [handImageLoaded, setHandImageLoaded] = useState(false);
  const handFgImageRef = useRef<HTMLImageElement>(null);
  const [handFgImageLoaded, setHandFgImageLoaded] = useState(false);
  const toolImageRef = useRef<HTMLImageElement>(null);
  const [toolImageLoaded, setToolImageLoaded] = useState(false);
  // Store how we drew the image to map between canvas and image space
  const drawInfoRef = useRef<{ dx:number; dy:number; s:number; iw:number; ih:number } | null>(null);

  // Load hand image for nib positioning
  useEffect(() => {
    if (!handAsset.imageBg) return;
    
    const img = new Image();
    img.onload = () => {
      if (handImageRef.current) {
        handImageRef.current = img;
        setHandImageLoaded(true);
      }
    };
    img.src = handAsset.imageBg;
    handImageRef.current = img;
  }, [handAsset.imageBg]);

  // Load tool image for preview overlay
  useEffect(() => {
    if (!toolAsset.image) return;
    const img = new Image();
    img.onload = () => {
      toolImageRef.current = img;
      setToolImageLoaded(true);
    };
    img.src = toolAsset.image;
    toolImageRef.current = img;
  }, [toolAsset.image]);

  // Load hand foreground image for proper masking preview
  useEffect(() => {
    if (!handAsset.imageFg) return;
    const img = new Image();
    img.onload = () => {
      handFgImageRef.current = img;
      setHandFgImageLoaded(true);
    };
    img.src = handAsset.imageFg;
    handFgImageRef.current = img;
  }, [handAsset.imageFg]);

  // Draw preview on canvas using the same compositor math as the main canvas
  useEffect(() => {
    if (!handImageLoaded || !previewCanvasRef.current || !handImageRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Choose active assets (mirrored or not) for geometry
    const activeHand = mirror ? HandToolCompositor.mirrorHandAsset(handAsset) : handAsset;
    const activeTool = mirror ? HandToolCompositor.mirrorToolAsset(toolAsset) : toolAsset;

    // 1) Compose at origin to measure bounds
    const baseComp = HandToolCompositor.composeHandTool(activeHand, activeTool, { x: 0, y: 0 }, 0, 1);

    // Compute axis-aligned bounds for angle 0 with helper
    const getCorners = (
      pos: { x: number; y: number },
      rot: number,
      scale: number,
      w: number,
      h: number
    ) => {
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const pts = [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ];
      return pts.map(p => ({
        x: pos.x + (p.x * cos - p.y * sin) * scale,
        y: pos.y + (p.x * sin + p.y * cos) * scale,
      }));
    };
    const handPts = getCorners(baseComp.handPosition, baseComp.handRotation, baseComp.handScale, handImageRef.current.width, handImageRef.current.height);
    const toolImg = toolImageRef.current;
    const toolPts = toolImg ? getCorners(baseComp.toolPosition, baseComp.toolRotation, baseComp.toolScale, toolImg.width, toolImg.height) : [];
    const allPts = handPts.concat(toolPts);
    const xs = allPts.map(p => p.x);
    const ys = allPts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const boundsW = maxX - minX;
    const boundsH = maxY - minY;

    // 2) Fit to canvas
    const margin = 24;
    const fitScale = Math.min(
      (canvas.width - margin) / Math.max(1, boundsW),
      (canvas.height - margin) / Math.max(1, boundsH)
    );
    const offsetX = (canvas.width - boundsW * fitScale) / 2 - minX * fitScale;
    const offsetY = (canvas.height - boundsH * fitScale) / 2 - minY * fitScale;

    // 3) Compose at centered position with fit scale (bake nibAnchor as custom tip anchor)
    let customTip: { x:number; y:number } | undefined;
    if (nibAnchor) {
      const base = HandToolCompositor.composeHandTool(activeHand, activeTool, { x: 0, y: 0 }, 0, 1);
      const baseNib = {
        x: base.finalTipPosition.x - base.handPosition.x,
        y: base.finalTipPosition.y - base.handPosition.y,
      };
      const nibInHand = mirror ? { x: activeHand.sizePx.w - nibAnchor.x, y: nibAnchor.y } : nibAnchor;
      const dxH = nibInHand.x - baseNib.x;
      const dyH = nibInHand.y - baseNib.y;
      if (Math.abs(dxH) + Math.abs(dyH) > 0.001) {
        const rel = base.toolRotation - base.handRotation;
        const cosR = Math.cos(rel), sinR = Math.sin(rel);
        const dtX = dxH * cosR - dyH * sinR;
        const dtY = dxH * sinR + dyH * cosR;
        customTip = { x: activeTool.tipAnchor.x + dtX, y: activeTool.tipAnchor.y + dtY };
      }
    }
    const comp = HandToolCompositor.composeHandTool(activeHand, activeTool, { x: offsetX, y: offsetY }, 0, fitScale, customTip);

    // Prepare mapping for click->image coords
    drawInfoRef.current = { dx: comp.handPosition.x, dy: comp.handPosition.y, s: comp.handScale, iw: activeHand.sizePx.w, ih: activeHand.sizePx.h };

    // 4) Draw background hand (top-left origin)
    ctx.save();
    ctx.translate(comp.handPosition.x, comp.handPosition.y);
    ctx.rotate(comp.handRotation);
    ctx.scale((mirror ? -1 : 1) * comp.handScale, comp.handScale);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(handImageRef.current, 0, 0);
    ctx.restore();

    // 5) Draw tool pinned to tip, with optional extra rotation (nibAnchor is already baked in)
    if (toolImageLoaded && toolImg) {
      const centerX = toolImg.width / 2;
      const centerY = toolImg.height / 2;
      const vx = activeTool.tipAnchor.x - centerX;
      const vy = activeTool.tipAnchor.y - centerY;
      const sx = comp.toolScale * (mirror ? -1 : 1);
      const sy = comp.toolScale;
      const baseRot = comp.toolRotation; // radians
      const totalRot = baseRot + (toolRotationOffsetDeg || 0) * Math.PI / 180;
      const useRot = nibLock ? totalRot : baseRot;
      const cosUse = Math.cos(useRot);
      const sinUse = Math.sin(useRot);
      const ux = (vx * sx) * cosUse - (vy * sy) * sinUse;
      const uy = (vx * sx) * sinUse + (vy * sy) * cosUse;
      let posX = comp.finalTipPosition.x - ux;
      let posY = comp.finalTipPosition.y - uy;

      // No world-space nudge here; customTip already applied

      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate(totalRot);
      ctx.scale(sx, sy);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(toolImg, -centerX, -centerY);
      ctx.restore();
    }

    // 6) Draw foreground hand overlay
    if (handFgImageLoaded && handFgImageRef.current) {
      ctx.save();
      ctx.translate(comp.handPosition.x, comp.handPosition.y);
      ctx.rotate(comp.handRotation);
      ctx.scale((mirror ? -1 : 1) * comp.handScale, comp.handScale);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(handFgImageRef.current, 0, 0);
      ctx.restore();
    }
  }, [handImageLoaded, handFgImageLoaded, toolImageLoaded, nibAnchor, mirror, handAsset, toolAsset, toolRotationOffsetDeg, nibLock]);

  // Handle canvas click for nib positioning
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!previewCanvasRef.current || !drawInfoRef.current) return;

    const rect = previewCanvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Map canvas coordinates back to image coordinates
    const { dx, dy, s, iw, ih } = drawInfoRef.current;
    let localX = (clickX - dx) / s;
    let localY = (clickY - dy) / s;
    if (mirror) localX = iw - localX;

    // Clamp to image bounds
    localX = Math.max(0, Math.min(iw, localX));
    localY = Math.max(0, Math.min(ih, localY));

  const next = { x: localX, y: localY };
  setNibAnchor(next);
  // Convert to extraOffset for live updates with restored renderer
  const extraOffset = {
    x: calibrationOffset.x,
    y: calibrationOffset.y
  };
  onLiveChange?.({ nibAnchor: next, extraOffset });
  forceUpdate(prev => prev + 1);
  };

  if (!isOpen) return null;

  return (
    <AssetLibraryPopup
      isOpen={isOpen}
      onClose={onClose}
      title="Hand Follower Calibration"
      initialWidth={800}
      initialHeight={600}
      minWidth={600}
      minHeight={400}
      footerText="Drag edges/corners to resize • ESC to close"
    >

        <div className="grid grid-cols-2 gap-6 h-full">
          {/* Left Column: Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Preview & Nib Position</h3>
            
            <div className="bg-gray-700 rounded p-4">
              <canvas
                ref={previewCanvasRef}
                width={320}
                height={240}
                className="border border-gray-600 cursor-crosshair bg-white"
                onClick={handleCanvasClick}
              />
              <p className="text-xs text-gray-400 mt-2">
                Click on the hand image to set tool tip position
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-400">Hand Coordinates</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">X (pixels)</label>
                  <input
                    type="number"
                    value={Math.round(nibAnchor.x)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const next = { ...nibAnchor, x: isFinite(v) ? v : 0 };
                      setNibAnchor(next);
                      // Convert to extraOffset for live updates
                      const extraOffset = {
                        x: calibrationOffset.x,
                        y: calibrationOffset.y
                      };
                      onLiveChange?.({ nibAnchor: next, extraOffset });
                      forceUpdate(prev => prev + 1);
                    }}
                    className="w-full p-2 bg-gray-700 text-white rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Y (pixels)</label>
                  <input
                    type="number"
                    value={Math.round(nibAnchor.y)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const next = { ...nibAnchor, y: isFinite(v) ? v : 0 };
                      setNibAnchor(next);
                      // Convert to extraOffset for live updates
                      const extraOffset = {
                        x: calibrationOffset.x,
                        y: calibrationOffset.y
                      };
                      onLiveChange?.({ nibAnchor: next, extraOffset });
                      forceUpdate(prev => prev + 1);
                    }}
                    className="w-full p-2 bg-gray-700 text-white rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Calibration Controls</h3>

            {/* Frenet Frame Calibration */}
            <div className="bg-blue-900/20 p-3 rounded">
              <h4 className="text-sm font-semibold text-blue-300 mb-2">Frenet Frame Calibration</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Along Tangent (X)</label>
                  <input
                    type="range"
                    min="-1000"
                    max="1000"
                    step="1"
                    value={calibrationOffset.x}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCalibrationOffset(prev => ({ ...prev, x: v }));
                      onLiveChange?.({ 
                        calibrationOffset: { x: v, y: calibrationOffset.y },
                        extraOffset: { x: v, y: calibrationOffset.y }
                      });
                      forceUpdate(prev => prev + 1);
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>-1000px</span>
                    <span>{calibrationOffset.x.toFixed(1)}px</span>
                    <span>+1000px</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Left Normal (Y)</label>
                  <input
                    type="range"
                    min="-1000"
                    max="1000"
                    step="1"
                    value={calibrationOffset.y}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCalibrationOffset(prev => ({ ...prev, y: v }));
                      onLiveChange?.({ 
                        calibrationOffset: { x: calibrationOffset.x, y: v },
                        extraOffset: { x: calibrationOffset.x, y: v }
                      });
                      forceUpdate(prev => prev + 1);
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>-1000px</span>
                    <span>{calibrationOffset.y.toFixed(1)}px</span>
                    <span>+1000px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tip Backtrack */}
            <div className="bg-green-900/20 p-3 rounded">
              <h4 className="text-sm font-semibold text-green-300 mb-2">Tip Backtrack</h4>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Backtrack Distance</label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="0.5"
                  value={tipBacktrackPx}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTipBacktrackPx(v);
                    onLiveChange?.({ 
                      tipBacktrackPx: v,
                      extraOffset: {
                        x: calibrationOffset.x,
                        y: calibrationOffset.y
                      }
                    });
                    forceUpdate(prev => prev + 1);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0px (auto)</span>
                  <span>{tipBacktrackPx.toFixed(1)}px</span>
                  <span>1000px</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  How far behind the ink tip should the nib sit (0 = automatic)
                </p>
              </div>
            </div>

            {/* Tool Rotation Offset */}
            <div className="bg-purple-900/20 p-3 rounded">
              <h4 className="text-sm font-semibold text-purple-300 mb-2">Tool Rotation</h4>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rotation Offset (degrees)</label>
                <input
                  type="range"
                  min="-360"
                  max="360"
                  step="1"
                  value={toolRotationOffsetDeg}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setToolRotationOffsetDeg(v);
                    onLiveChange?.({ 
                      toolRotationOffsetDeg: v,
                      extraOffset: { x: calibrationOffset.x, y: calibrationOffset.y },
                    });
                    forceUpdate(prev => prev + 1);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>-360°</span>
                  <span>{toolRotationOffsetDeg.toFixed(0)}°</span>
                  <span>+360°</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Rotates the tool image around the tip for perfect alignment.
                </p>
              </div>
              {/* Nib lock is always ON; checkbox removed intentionally */}
            </div>

            {/* Mirror UI removed — mirror is managed in Properties Panel. */}

            {/* Frenet Frame Information */}
            <div className="mt-4 p-3 bg-yellow-900/20 rounded">
              <p className="text-xs text-yellow-300">
                💡 <strong>Frenet-Frame Calibration:</strong> This positions the hand using the same arc-length parameter as the stroke, 
                preventing drift even on very long, curvy paths. Click on the hand to set nib position, then use sliders to fine-tune.
              </p>
            </div>
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={() => {
              onApply?.({
                tipBacktrackPx,
                calibrationOffset,
                nibAnchor,
                mirror,
                showForeground: true,
                toolRotationOffsetDeg,
                calibrationBaseScale: initialSettings?.baseScale ?? 1,
                nibLock: true,
                extraOffset: { x: calibrationOffset.x, y: calibrationOffset.y },
              });
              onClose();
            }}
            className="px-3 py-1 bg-green-600 rounded text-white hover:bg-green-700"
          >
            Save Calibration
          </button>
          <button
            onClick={() => {
              let defaultNibAnchor = { x: handAsset.gripBase.x, y: handAsset.gripBase.y };
              try {
                const comp = HandToolCompositor.composeHandTool(
                  handAsset,
                  toolAsset,
                  { x: 0, y: 0 },
                  0,
                  1
                );
                defaultNibAnchor = {
                  x: comp.finalTipPosition.x - comp.handPosition.x,
                  y: comp.finalTipPosition.y - comp.handPosition.y,
                };
              } catch {}
              setTipBacktrackPx(0);
              setCalibrationOffset({ x: 0, y: 0 });
              setNibAnchor(defaultNibAnchor);
              setMirror(false);
              setToolRotationOffsetDeg(0);
              
              // Send live update for reset
              onLiveChange?.({ 
                tipBacktrackPx: 0,
                calibrationOffset: { x: 0, y: 0 },
                nibAnchor: defaultNibAnchor,
                mirror: false,
                toolRotationOffsetDeg: 0,
                extraOffset: { x: 0, y: 0 }
              });
              forceUpdate(prev => prev + 1);
            }}
            className="px-3 py-1 bg-gray-700 rounded text-white hover:bg-gray-600"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-blue-600 rounded text-white hover:bg-blue-700"
          >
            Close
          </button>
        </div>
    </AssetLibraryPopup>
  );
};

export default HandFollowerCalibrationModal;
