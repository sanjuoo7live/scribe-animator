/**
 * Visual Tip Anchor Calibration Tool
 * Allows users to click on hand images to set precise pen tip positions
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface TipAnchorCalibratorProps {
  handImage: string | File; // Image URL or File object
  onCalibrateComplete: (tipAnchor: { x: number; y: number }) => void;
  onCancel: () => void;
  existingAnchor?: { x: number; y: number };
  previewPath?: string; // SVG path for testing the tip position
}

export const TipAnchorCalibrator: React.FC<TipAnchorCalibratorProps> = ({
  handImage,
  onCalibrateComplete,
  onCancel,
  existingAnchor,
  previewPath = "M 50 150 Q 150 50 250 150 T 450 150" // Default test path
}) => {
  const [tipAnchor, setTipAnchor] = useState(existingAnchor || { x: 0.5, y: 0.5 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [showPreview, setShowPreview] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw hand image with tip anchor crosshair
  const drawCalibrationCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fit image with max width/height
    const maxSize = 400;
    const scale = Math.min(maxSize / img.width, maxSize / img.height);
    const displayWidth = img.width * scale;
    const displayHeight = img.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Clear and draw image
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

    // Draw tip anchor crosshair
    const anchorX = tipAnchor.x * displayWidth;
    const anchorY = tipAnchor.y * displayHeight;

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, anchorY);
    ctx.lineTo(displayWidth, anchorY);
    ctx.stroke();

    // Vertical line  
    ctx.beginPath();
    ctx.moveTo(anchorX, 0);
    ctx.lineTo(anchorX, displayHeight);
    ctx.stroke();

    // Center circle
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, 6, 0, 2 * Math.PI);
    ctx.fill();

    // White center dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(anchorX, anchorY, 2, 0, 2 * Math.PI);
    ctx.fill();
  }, [tipAnchor]);

  // Load image and get dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
      drawCalibrationCanvas(img);
    };

    if (typeof handImage === 'string') {
      img.src = handImage;
    } else {
      const url = URL.createObjectURL(handImage);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    }

    imageRef.current = img;
  }, [handImage, drawCalibrationCanvas]);

  // Redraw when tip anchor changes
  useEffect(() => {
    if (imageLoaded && imageRef.current) {
      drawCalibrationCanvas(imageRef.current);
    }
  }, [tipAnchor, imageLoaded, drawCalibrationCanvas]);

  // Handle canvas click to set tip anchor
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / canvas.width;
    const y = (event.clientY - rect.top) / canvas.height;

    setTipAnchor({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  }, []);

  // Draw preview of hand following path
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !showPreview) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 500;
    canvas.height = 200;

    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 500, 200);

    // Draw test path
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    const path = new Path2D(previewPath);
    ctx.stroke(path);

    // Calculate hand positions along path (simplified)
    const handScale = 0.3;
    const handWidth = img.width * handScale;
    const handHeight = img.height * handScale;

    // Sample 5 positions along the path for preview
    for (let i = 0; i <= 4; i++) {
      const progress = i / 4;
      
      // Simple path sampling (for real implementation, use PathSampler)
      const pathX = 50 + progress * 400;
      const pathY = 150 + Math.sin(progress * Math.PI * 2) * 30;

      // Position hand so tip anchor aligns with path point
      const handX = pathX - (tipAnchor.x * handWidth);
      const handY = pathY - (tipAnchor.y * handHeight);

      // Draw hand with transparency based on position
      ctx.globalAlpha = 0.3 + (0.4 * (i / 4));
      ctx.drawImage(img, handX, handY, handWidth, handHeight);

      // Draw tip point
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(pathX, pathY, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }, [tipAnchor, showPreview, previewPath]);

  useEffect(() => {
    if (showPreview) {
      drawPreview();
    }
  }, [showPreview, drawPreview]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-semibold mb-4">Calibrate Pen Tip Position</h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Click on the exact point where the pen tip touches the paper. This ensures the hand follows paths accurately.
          </p>
          
          {imageLoaded && (
            <div className="bg-gray-100 p-4 rounded mb-4">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="border border-gray-300 cursor-crosshair rounded"
                style={{ maxWidth: '100%' }}
              />
              
              <div className="mt-2 text-xs text-gray-500">
                <p>Tip Position: X: {(tipAnchor.x * 100).toFixed(1)}%, Y: {(tipAnchor.y * 100).toFixed(1)}%</p>
                <p>Image Size: {imageDimensions.width} × {imageDimensions.height}px</p>
              </div>
            </div>
          )}

          {!imageLoaded && (
            <div className="bg-gray-100 p-8 rounded text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading image...</p>
            </div>
          )}
        </div>

        {/* Preview Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show path following preview</span>
          </label>
          
          {showPreview && imageLoaded && (
            <div className="mt-2 bg-gray-50 p-2 rounded">
              <canvas
                ref={previewCanvasRef}
                className="border border-gray-300 rounded w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Preview shows how the hand will follow a sample path with current tip position
              </p>
            </div>
          )}
        </div>

        {/* Preset Positions */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Quick Presets:</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTipAnchor({ x: 0.75, y: 0.87 })}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
            >
              Pencil Tip (Right)
            </button>
            <button
              onClick={() => setTipAnchor({ x: 0.25, y: 0.87 })}
              className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
            >
              Pencil Tip (Left)
            </button>
            <button
              onClick={() => setTipAnchor({ x: 0.5, y: 0.5 })}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
            >
              Center
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onCalibrateComplete(tipAnchor)}
            disabled={!imageLoaded}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            Save Tip Position
          </button>
        </div>
      </div>
    </div>
  );
};
