import React, { useState, useEffect, useRef } from 'react';
import AssetLibraryPopup from '../panels/AssetLibraryPopup';
import { HandAsset, ToolAsset } from '../../types/handAssets';

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
    scale?: number;
    mirror?: boolean;
    showForeground?: boolean;
  };
  onApply: (settings: {
    tipBacktrackPx: number;
    calibrationOffset: { x: number; y: number };
    nibAnchor: { x: number; y: number };
    scale: number;
    mirror: boolean;
    showForeground: boolean;
    extraOffset?: { x: number; y: number }; // Add extraOffset for the restored renderer
  }) => void;
  onLiveChange?: (partial: Partial<{
    tipBacktrackPx: number;
    calibrationOffset: { x: number; y: number };
    nibAnchor: { x: number; y: number };
    scale: number;
    mirror: boolean;
    showForeground: boolean;
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
  const [nibAnchor, setNibAnchor] = useState(
    initialSettings?.nibAnchor ?? { 
      x: handAsset.sizePx.w * 0.75, // Default nib position
      y: handAsset.sizePx.h * 0.87 
    }
  );
  const [scale, setScale] = useState(initialSettings?.scale ?? 1);
  const [mirror, setMirror] = useState(initialSettings?.mirror ?? false);
  const [showForeground, setShowForeground] = useState(initialSettings?.showForeground ?? true);
  
  // Preview canvas refs
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const handImageRef = useRef<HTMLImageElement>(null);
  const [handImageLoaded, setHandImageLoaded] = useState(false);
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

  // Draw preview on canvas
  useEffect(() => {
    if (!handImageLoaded || !previewCanvasRef.current || !handImageRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fit hand image with padding and draw (no canvas mirroring; we handle mirror in coordinates)
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
    ctx.drawImage(handImageRef.current, dx, dy, dw, dh);

    // Draw nib anchor crosshair (mirror-safe)
    const anchorX = mirror ? (iw - nibAnchor.x) : nibAnchor.x;
    const anchorY = nibAnchor.y;
    const nibX = dx + anchorX * s;
    const nibY = dy + anchorY * s;

    // Draw tool aligned so tipAnchor sits at nib
    if (toolImageLoaded && toolImageRef.current) {
      const ti = toolImageRef.current;
      const tiw = ti.naturalWidth || ti.width;
      const tih = ti.naturalHeight || ti.height;
      // Preview tool scale relative to hand preview scale so it looks natural
      const st = Math.min(1.25, Math.max(0.25, (handAsset.sizePx.h / Math.max(1, tih)) * 0.22));
      const tipX = toolAsset.tipAnchor.x;
      const tipY = toolAsset.tipAnchor.y;
      const drawX = Math.round(nibX - tipX * st);
      const drawY = Math.round(nibY - tipY * st);
      const dwTool = Math.round(tiw * st);
      const dhTool = Math.round(tih * st);
      ctx.drawImage(ti, drawX, drawY, dwTool, dhTool);
    } else {
      // Fallback marker
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(nibX, nibY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

  }, [handImageLoaded, toolImageLoaded, nibAnchor, mirror, handAsset.sizePx, toolAsset.tipAnchor.x, toolAsset.tipAnchor.y]);

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
                Click on the hand image to set nib position (red crosshairs)
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
                    min="-20"
                    max="20"
                    step="0.5"
                    value={calibrationOffset.x}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCalibrationOffset(prev => ({ ...prev, x: v }));
                      onLiveChange?.({ 
                        calibrationOffset: { x: v, y: calibrationOffset.y },
                        extraOffset: { x: v, y: calibrationOffset.y }
                      });
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>-20px</span>
                    <span>{calibrationOffset.x.toFixed(1)}px</span>
                    <span>+20px</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Left Normal (Y)</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={calibrationOffset.y}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCalibrationOffset(prev => ({ ...prev, y: v }));
                      onLiveChange?.({ 
                        calibrationOffset: { x: calibrationOffset.x, y: v },
                        extraOffset: { x: calibrationOffset.x, y: v }
                      });
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>-20px</span>
                    <span>{calibrationOffset.y.toFixed(1)}px</span>
                    <span>+20px</span>
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
                  max="40"
                  step="0.5"
                  value={tipBacktrackPx}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTipBacktrackPx(v);
                    onLiveChange?.({ tipBacktrackPx: v });
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0px (auto)</span>
                  <span>{tipBacktrackPx.toFixed(1)}px</span>
                  <span>40px</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  How far behind the ink tip should the nib sit (0 = automatic)
                </p>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-gray-700/40 p-3 rounded">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Appearance</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Scale</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 text-center">{scale.toFixed(1)}x</div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={mirror}
                      onChange={(e) => setMirror(e.target.checked)}
                    />
                    Mirror (Left/Right)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={showForeground}
                      onChange={(e) => setShowForeground(e.target.checked)}
                    />
                    Show Foreground
                  </label>
                </div>
              </div>
            </div>

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
              setTipBacktrackPx(0);
              setCalibrationOffset({ x: 0, y: 0 });
              setNibAnchor({ 
                x: handAsset.sizePx.w * 0.75, 
                y: handAsset.sizePx.h * 0.87 
              });
              setScale(1);
              setMirror(false);
              setShowForeground(true);
            }}
            className="px-3 py-1 bg-gray-700 rounded text-white hover:bg-gray-600"
          >
            Reset to Defaults
          </button>
          <button
            onClick={() => {
              // Convert nibAnchor to extraOffset for the restored renderer
              // extraOffset represents how much to move the hand from its natural grip position
              const extraOffset = {
                x: calibrationOffset.x,
                y: calibrationOffset.y
              };
              
              onApply({
                tipBacktrackPx,
                calibrationOffset,
                nibAnchor,
                scale,
                mirror,
                showForeground,
                extraOffset, // Pass the extraOffset for the restored renderer
              });
              onClose();
            }}
            className="px-3 py-1 bg-blue-600 rounded text-white hover:bg-blue-700"
          >
            Apply Settings
          </button>
        </div>
    </AssetLibraryPopup>
  );
};

export default HandFollowerCalibrationModal;
