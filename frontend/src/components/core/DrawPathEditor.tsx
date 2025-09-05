import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';

interface DrawPath {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  duration: number;
  color: string;
  strokeWidth: number;
  createdAt: string;
  assetId?: string; // Link path to specific asset
}

interface DrawPathEditorProps {
  isOpen: boolean;
  onClose: () => void;
  assetId?: string;
  assetSrc?: string;
  onAssetDeleted?: (id: string) => void;
}

const DrawPathEditor: React.FC<DrawPathEditorProps> = ({ 
  isOpen, 
  onClose, 
  assetId, 
  assetSrc, 
  onAssetDeleted 
}) => {
  const { addObject, currentProject } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [savedPaths, setSavedPaths] = useState<DrawPath[]>([]);
  const [pathName, setPathName] = useState('');
  const [pathDuration, setPathDuration] = useState(3);
  const [pathColor, setPathColor] = useState('#000000');
  const [pathStrokeWidth, setPathStrokeWidth] = useState(2);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Auto-trace functionality
  const [isAutoTracing, setIsAutoTracing] = useState(false);
  const [autoTraceRegion, setAutoTraceRegion] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  
  // Enhanced pen/hand selection
  const [selectedPenType, setSelectedPenType] = useState('pen');
  const [selectedHandAsset, setSelectedHandAsset] = useState('hand1');
  
  // Per-path settings
  const [pathSettings, setPathSettings] = useState({
    animationSpeed: 1,
    fadeIn: true,
    fadeOut: false,
    customDelay: 0,
    edgeSensitivity: 50
  });
  
  // Canvas zoom and pan controls
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Load persisted paths from localStorage
  useEffect(() => {
    if (assetId) {
      const savedData = localStorage.getItem(`drawPaths_${assetId}`);
      if (savedData) {
        try {
          const paths = JSON.parse(savedData) as DrawPath[];
          setSavedPaths(paths);
        } catch (e) {
          console.error('Failed to load saved paths:', e);
        }
      }
    }
  }, [assetId]);

  // Save paths to localStorage when they change
  useEffect(() => {
    if (assetId && savedPaths.length >= 0) {
      localStorage.setItem(`drawPaths_${assetId}`, JSON.stringify(savedPaths));
    }
  }, [assetId, savedPaths]);

  // Keyboard shortcuts for zoom and pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(prev => Math.min(prev * 1.2, 3));
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(prev => Math.max(prev / 1.2, 0.3));
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(1);
            setPanX(0);
            setPanY(0);
          }
          break;
        case 'ArrowUp':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setPanY(prev => prev + 10);
          }
          break;
        case 'ArrowDown':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setPanY(prev => prev - 10);
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setPanX(prev => prev + 10);
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setPanX(prev => prev - 10);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && canvasRef.current && assetSrc) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Load and draw the asset image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          canvas.width = 400;
          canvas.height = 400;
          
          // Calculate scaling to fit image in canvas
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          setImageLoaded(true);
        };
        img.src = assetSrc;
      }
    }
  }, [isOpen, assetSrc]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Account for zoom and pan transformations
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const x = (rawX / zoom) - panX;
    const y = (rawY / zoom) - panY;

    if (isAutoTracing) {
      // Start region selection for auto-trace
      setAutoTraceRegion({ startX: x, startY: y, endX: x, endY: y });
    } else {
      // Regular drawing mode
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    // Account for zoom and pan transformations
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const x = (rawX / zoom) - panX;
    const y = (rawY / zoom) - panY;

    if (isAutoTracing && autoTraceRegion) {
      // Update region selection
      setAutoTraceRegion(prev => prev ? { ...prev, endX: x, endY: y } : null);
      
      // Redraw canvas with selection rectangle
      redrawCanvas();
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        autoTraceRegion.startX,
        autoTraceRegion.startY,
        x - autoTraceRegion.startX,
        y - autoTraceRegion.startY
      );
      ctx.setLineDash([]);
    } else if (isDrawing) {
      // Regular drawing mode
      setCurrentPath(prev => [...prev, { x, y }]);

      // Draw the current path
      ctx.beginPath();
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = pathStrokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentPath.length > 0) {
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isAutoTracing && autoTraceRegion) {
      // Complete auto-trace region selection and perform trace
      const { startX, startY, endX, endY } = autoTraceRegion;
      performAutoTrace(
        Math.min(startX, endX),
        Math.min(startY, endY),
        Math.max(startX, endX),
        Math.max(startY, endY)
      );
      setAutoTraceRegion(null);
    } else if (isDrawing) {
      // Regular drawing mode
      setIsDrawing(false);
      
      if (currentPath.length > 1) {
        // Path is complete, user can now save it
      }
    }
  };

  const savePath = () => {
    if (currentPath.length < 2 || !pathName.trim()) {
      alert('Please draw a path and provide a name');
      return;
    }

    const newPath: DrawPath = {
      id: `path-${Date.now()}`,
      name: pathName.trim(),
      points: [...currentPath],
      duration: pathDuration,
      color: pathColor,
      strokeWidth: pathStrokeWidth,
      createdAt: new Date().toISOString(),
      assetId: assetId // Link path to current asset
    };

    setSavedPaths(prev => [...prev, newPath]);
    setCurrentPath([]);
    setPathName('');
    
    // Clear and redraw canvas
    redrawCanvas();
  };

  // Auto-trace functionality - detect edges and create path
  const performAutoTrace = (startX: number, startY: number, endX: number, endY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get image data for edge detection
    const imageData = ctx.getImageData(startX, startY, endX - startX, endY - startY);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const tracedPoints: { x: number; y: number }[] = [];

    // Simple edge detection - find pixels with significant brightness changes
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const currentBrightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Check neighboring pixels
        const leftIdx = (y * width + (x - 1)) * 4;
        const rightIdx = (y * width + (x + 1)) * 4;
        const topIdx = ((y - 1) * width + x) * 4;
        const bottomIdx = ((y + 1) * width + x) * 4;
        
        const leftBrightness = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
        const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        const topBrightness = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3;
        const bottomBrightness = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
        
        // If there's a significant brightness difference, it's likely an edge
        const threshold = pathSettings.edgeSensitivity || 50;
        if (
          Math.abs(currentBrightness - leftBrightness) > threshold ||
          Math.abs(currentBrightness - rightBrightness) > threshold ||
          Math.abs(currentBrightness - topBrightness) > threshold ||
          Math.abs(currentBrightness - bottomBrightness) > threshold
        ) {
          tracedPoints.push({ x: startX + x, y: startY + y });
        }
      }
    }

    // If we found edge points, set them as current path
    if (tracedPoints.length > 0) {
      // Sort points to create a connected path (simple approach)
      const sortedPoints = tracedPoints.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 5) {
          return a.x - b.x; // Sort by x if y is similar
        }
        return a.y - b.y; // Sort by y primarily
      });
      
      setCurrentPath(sortedPoints);
      
      // Draw the traced path on canvas
      ctx.beginPath();
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = pathStrokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (sortedPoints.length > 0) {
        ctx.moveTo(sortedPoints[0].x, sortedPoints[0].y);
        sortedPoints.forEach((point, index) => {
          if (index > 0) {
            ctx.lineTo(point.x, point.y);
          }
        });
      }
      ctx.stroke();
    }
  };

  const redrawCanvas = () => {
    if (!canvasRef.current || !assetSrc) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // Redraw all saved paths
      savedPaths.forEach(path => {
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (path.points.length > 0) {
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
        }
        ctx.stroke();
      });
    };
    img.src = assetSrc;
  };

  const clearCurrentPath = () => {
    setCurrentPath([]);
    redrawCanvas();
  };

  // Reset everything: current path, saved paths, settings, view, and persisted storage
  const resetAll = () => {
    if (!window.confirm('Reset all paths and settings for this asset? This cannot be undone.')) return;
    setIsDrawing(false);
    setCurrentPath([]);
    setSavedPaths([]);
    if (assetId) {
      try { localStorage.removeItem(`drawPaths_${assetId}`); } catch {}
    }
    // Restore defaults
    setPathName('');
    setPathDuration(3);
    setPathColor('#000000');
    setPathStrokeWidth(2);
    setSelectedPenType('pen');
    setSelectedHandAsset('hand1');
    setPathSettings({
      animationSpeed: 1,
      fadeIn: true,
      fadeOut: false,
      customDelay: 0,
      edgeSensitivity: 50,
    });
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setIsAutoTracing(false);
    setAutoTraceRegion(null);
    // Redraw image only
    setTimeout(() => redrawCanvas(), 0);
  };

  const deletePath = (pathId: string) => {
    setSavedPaths(prev => prev.filter(p => p.id !== pathId));
    setTimeout(redrawCanvas, 0);
  };

  const addPathToCanvas = (path: DrawPath) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const newObject = {
      id: `drawpath-${path.id}-${Date.now()}`,
      type: 'drawPath' as const,
      x: 200,
      y: 200,
      width: 400,
      height: 400,
      properties: {
        pathId: path.id,
        pathName: path.name,
        points: path.points,
        strokeColor: path.color,
        strokeWidth: path.strokeWidth,
        assetSrc: assetSrc || '',
        selectedPenType: selectedPenType,
        selectedHandAsset: selectedHandAsset,
        pathSettings: pathSettings
      },
      animationStart: 0,
      animationDuration: path.duration * pathSettings.animationSpeed,
      animationType: 'drawIn' as const,
      animationEasing: 'linear' as const
    };

    addObject(newObject);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Draw Path Editor</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-2">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">
                Draw Path on Asset
              </h4>
              
              {/* Image controls */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setZoom(prev => Math.min(prev * 1.2, 3))}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                  title="Zoom In"
                >
                  🔍+
                </button>
                <button
                  onClick={() => setZoom(prev => Math.max(prev / 1.2, 0.3))}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                  title="Zoom Out"
                >
                  🔍-
                </button>
                <button
                  onClick={() => {setZoom(1); setPanX(0); setPanY(0);}}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                  title="Reset View"
                >
                  ⟲
                </button>
                <span className="text-xs text-gray-400 self-center">
                  Zoom: {Math.round(zoom * 100)}%
                </span>
              </div>
              
              {/* Keyboard shortcuts help */}
              <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-800 rounded">
                <div className="font-semibold mb-1">Keyboard Shortcuts:</div>
                <div>• Ctrl/Cmd + Plus: Zoom In</div>
                <div>• Ctrl/Cmd + Minus: Zoom Out</div>
                <div>• Ctrl/Cmd + 0: Reset View</div>
                <div>• Ctrl/Cmd + Arrows: Pan Image</div>
                <div>• Mouse Wheel: Zoom In/Out</div>
              </div>
              
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
                  }}
                  className="border border-gray-600 rounded cursor-crosshair bg-white"
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
                    transformOrigin: 'top left'
                  }}
                />
                
                {isAutoTracing && (
                  <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    Auto-Trace Mode: Select region to trace
                  </div>
                )}
                
                {autoTraceRegion && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Region Selected: {Math.abs(autoTraceRegion.endX - autoTraceRegion.startX)}×{Math.abs(autoTraceRegion.endY - autoTraceRegion.startY)}
                  </div>
                )}
              </div>

              {!imageLoaded && assetSrc && (
                <div className="text-center text-gray-400 py-8">
                  Loading asset image...
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={clearCurrentPath}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                >
                  Clear Path
                </button>
                <button
                  onClick={resetAll}
                  className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white text-sm rounded"
                  title="Clear all paths and restore defaults"
                >
                  Reset All
                </button>
                <button
                  onClick={redrawCanvas}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
                >
                  Reset Canvas
                </button>
              </div>
            </div>
          </div>

          {/* Controls and Saved Paths */}
          <div className="space-y-4">
            {/* Drawing Mode Controls */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Drawing Mode</h4>
              
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setIsAutoTracing(false)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    !isAutoTracing 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Manual Draw
                </button>
                <button
                  onClick={() => setIsAutoTracing(true)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    isAutoTracing 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Auto Trace
                </button>
              </div>
              
              {isAutoTracing && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
                    <strong>Auto Trace:</strong> Click and drag to select a region on the image. 
                    The system will automatically detect edges and create a path.
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Edge Sensitivity</label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={pathSettings.edgeSensitivity || 50}
                      onChange={(e) => setPathSettings(prev => ({ ...prev, edgeSensitivity: Number(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400">
                      {pathSettings.edgeSensitivity || 50} (Lower = more sensitive)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pen & Hand Selection */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Pen & Hand Selection</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Pen Type</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {['pen', 'pencil', 'marker', 'brush', 'highlighter'].map((penType) => (
                      <button
                        key={penType}
                        onClick={() => setSelectedPenType(penType)}
                        className={`p-2 rounded border-2 transition-colors ${
                          selectedPenType === penType
                            ? 'border-blue-500 bg-blue-600'
                            : 'border-gray-500 bg-gray-600 hover:bg-gray-500'
                        }`}
                        title={penType.charAt(0).toUpperCase() + penType.slice(1)}
                      >
                        <div className="text-lg">
                          {penType === 'pen' ? '🖊️' : 
                           penType === 'pencil' ? '✏️' : 
                           penType === 'marker' ? '🖍️' : 
                           penType === 'brush' ? '🖌️' : '🖊️'}
                        </div>
                        <div className="text-xs text-gray-200 mt-1">{penType}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2">Hand Style</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[
                      { id: 'hand1', name: 'Professional', icon: '👉🏻' },
                      { id: 'hand2', name: 'Casual', icon: '👉🏽' },
                      { id: 'hand3', name: 'Detailed', icon: '👉🏿' },
                      { id: 'glove1', name: 'Gloved', icon: '🧤' },
                      { id: 'none', name: 'No Hand', icon: '🚫' }
                    ].map((hand) => (
                      <button
                        key={hand.id}
                        onClick={() => setSelectedHandAsset(hand.id)}
                        className={`p-2 rounded border-2 transition-colors ${
                          selectedHandAsset === hand.id
                            ? 'border-blue-500 bg-blue-600'
                            : 'border-gray-500 bg-gray-600 hover:bg-gray-500'
                        }`}
                        title={hand.name}
                      >
                        <div className="text-lg">{hand.icon}</div>
                        <div className="text-xs text-gray-200 mt-1">{hand.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview section */}
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-xs text-gray-400 mb-2">Animation Preview:</div>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {selectedPenType === 'pen' ? '🖊️' : 
                       selectedPenType === 'pencil' ? '✏️' : 
                       selectedPenType === 'marker' ? '🖍️' : 
                       selectedPenType === 'brush' ? '🖌️' : '🖊️'}
                    </div>
                    {selectedHandAsset !== 'none' && (
                      <div className="text-2xl">
                        {selectedHandAsset === 'hand1' ? '👉🏻' :
                         selectedHandAsset === 'hand2' ? '👉🏽' :
                         selectedHandAsset === 'hand3' ? '👉🏿' :
                         selectedHandAsset === 'glove1' ? '🧤' : '👉🏻'}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Will appear during animation
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Path Settings */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Advanced Settings</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Animation Speed</label>
                  <input
                    type="range"
                    value={pathSettings.animationSpeed}
                    onChange={(e) => setPathSettings(prev => ({ ...prev, animationSpeed: Number(e.target.value) }))}
                    min="0.1"
                    max="3"
                    step="0.1"
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400">{pathSettings.animationSpeed}x</div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Fade In</label>
                  <input
                    type="checkbox"
                    checked={pathSettings.fadeIn}
                    onChange={(e) => setPathSettings(prev => ({ ...prev, fadeIn: e.target.checked }))}
                    className="w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Fade Out</label>
                  <input
                    type="checkbox"
                    checked={pathSettings.fadeOut}
                    onChange={(e) => setPathSettings(prev => ({ ...prev, fadeOut: e.target.checked }))}
                    className="w-4 h-4"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Custom Delay (seconds)</label>
                  <input
                    type="number"
                    value={pathSettings.customDelay}
                    onChange={(e) => setPathSettings(prev => ({ ...prev, customDelay: Number(e.target.value) }))}
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full p-2 bg-gray-600 text-white rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Path Settings */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Path Settings</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Path Name</label>
                  <input
                    type="text"
                    value={pathName}
                    onChange={(e) => setPathName(e.target.value)}
                    placeholder="Enter path name"
                    className="w-full p-2 bg-gray-600 text-white rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Duration (seconds)</label>
                  <input
                    type="number"
                    value={pathDuration}
                    onChange={(e) => setPathDuration(Number(e.target.value))}
                    min="0.1"
                    max="30"
                    step="0.1"
                    className="w-full p-2 bg-gray-600 text-white rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Color</label>
                  <input
                    type="color"
                    value={pathColor}
                    onChange={(e) => setPathColor(e.target.value)}
                    className="w-full h-8 bg-gray-600 rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Stroke Width</label>
                  <input
                    type="range"
                    value={pathStrokeWidth}
                    onChange={(e) => setPathStrokeWidth(Number(e.target.value))}
                    min="1"
                    max="10"
                    className="w-full"
                  />
                  <div className="text-xs text-gray-400">{pathStrokeWidth}px</div>
                </div>

                <button
                  onClick={savePath}
                  disabled={currentPath.length < 2 || !pathName.trim()}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded"
                >
                  Save Path
                </button>
              </div>
            </div>

            {/* Saved Paths */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">
                Saved Paths ({savedPaths.length})
              </h4>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedPaths.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-4">
                    No paths saved yet
                  </div>
                ) : (
                  savedPaths.map((path) => (
                    <div
                      key={path.id}
                      className="bg-gray-600 rounded p-2 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{path.name}</div>
                        <div className="text-xs text-gray-400">
                          {path.duration}s • {path.points.length} points
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => addPathToCanvas(path)}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                          title="Add to canvas"
                        >
                          +
                        </button>
                        <button
                          onClick={() => deletePath(path.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                          title="Delete path"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawPathEditor;
