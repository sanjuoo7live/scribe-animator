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
  const [nibLock, setNibLock] = useState<boolean>(!!initialSettings?.nibLock);
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

  // Draw preview on canvas
  useEffect(() => {
    if (!handImageLoaded || !previewCanvasRef.current || !handImageRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fit hand image with padding and draw; apply mirror and user scale.
    const pad = 20;
    const iw = handImageRef.current.naturalWidth || handImageRef.current.width;
    const ih = handImageRef.current.naturalHeight || handImageRef.current.height;
    const availW = canvas.width - pad * 2;
    const availH = canvas.height - pad * 2;
    const s = Math.min(availW / iw, availH / ih);
    const dw = iw * s;
    const dh = ih * s;
    const dx = Math.round((canvas.width - dw) / 2);
    const dy = Math.round((canvas.height - dh) / 2);
    drawInfoRef.current = { dx, dy, s, iw, ih };
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    if (mirror) {
      ctx.save();
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(handImageRef.current, 0, 0, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(handImageRef.current, dx, dy, dw, dh);
    }

    // Draw nib anchor crosshair (mirror-safe)
    const anchorX = mirror ? (iw - nibAnchor.x) : nibAnchor.x;
    const anchorY = nibAnchor.y;
    const nibX = dx + anchorX * s;
    const nibY = dy + anchorY * s;

    // Draw tool: rotate around CENTER but keep nib pinned at nibX/nibY using compensation
    if (toolImageLoaded && toolImageRef.current) {
      const ti = toolImageRef.current;
      const tiw = ti.naturalWidth || ti.width;
      const tih = ti.naturalHeight || ti.height;
      // Preview tool scale relative to hand preview scale so it looks natural
      const st = Math.min(0.8, Math.max(0.15, (handAsset.sizePx.h / Math.max(1, tih)) * 0.15));
      const cx = tiw / 2;
      const cy = tih / 2;
      const vx = toolAsset.tipAnchor.x - cx;
      const vy = toolAsset.tipAnchor.y - cy;
      const sx = st * (mirror ? -1 : 1);
      const sy = st;
      // Use total rotation for compensation so tip remains at nib
      const totalRad = ((toolAsset.rotationOffsetDeg || 0) + toolRotationOffsetDeg) * Math.PI / 180;
      const cosT = Math.cos(totalRad);
      const sinT = Math.sin(totalRad);
      const ux = (vx * sx) * cosT - (vy * sy) * sinT;
      const uy = (vx * sx) * sinT + (vy * sy) * cosT;
      const posX = Math.round(nibX - ux);
      const posY = Math.round(nibY - uy);
      const dwTool = Math.round(tiw * Math.abs(st));
      const dhTool = Math.round(tih * st);
      ctx.save();
      ctx.translate(posX, posY);
      // Rotate by total angle
      ctx.rotate(totalRad);
      if (mirror) ctx.scale(-1, 1);
      ctx.drawImage(
        ti,
        Math.round(-cx * st),
        Math.round(-cy * st),
        dwTool,
        dhTool
      );
      ctx.restore();
    } else {
      // Fallback marker
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(nibX, nibY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw foreground overlay (thumb/fingers) to properly mask the tool
    if (handFgImageLoaded && handFgImageRef.current) {
      if (mirror) {
        ctx.save();
        ctx.translate(dx + dw, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(handFgImageRef.current, 0, 0, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(handFgImageRef.current, dx, dy, dw, dh);
      }
    }

    // Crosshair removed to avoid slight offset; tool tip indicates nib.
  }, [handImageLoaded, handFgImageLoaded, toolImageLoaded, nibAnchor, mirror, calibrationOffset, handAsset.sizePx, toolAsset.tipAnchor.x, toolAsset.tipAnchor.y, toolRotationOffsetDeg, toolAsset.rotationOffsetDeg]);

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
              <h4 className="text-sm font-semibold text-gray-400">Nib Coordinates</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">X (pixels)</label>
                  <input
                    type="number"
                    value={Math.round(nibAnchor.x)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const next = { ...nibAnchor, x: v };
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
                      const next = { ...nibAnchor, y: v };
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
              <label className="flex items-center gap-2 mt-2 text-xs text-gray-300">
                <input type="checkbox" checked={nibLock} onChange={(e)=> setNibLock(e.target.checked)} />
                Nib Lock (keep tip pinned)
              </label>
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
                nibLock,
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
