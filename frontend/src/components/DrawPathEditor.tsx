import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

interface DrawPath {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  duration: number;
  color: string;
  strokeWidth: number;
  createdAt: string;
}

interface DrawPathEditorProps {
  isOpen: boolean;
  onClose: () => void;
  assetId?: string;
  assetSrc?: string;
}

const DrawPathEditor: React.FC<DrawPathEditorProps> = ({ isOpen, onClose, assetId, assetSrc }) => {
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (currentPath.length > 1) {
      // Path is complete, user can now save it
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
      createdAt: new Date().toISOString()
    };

    setSavedPaths(prev => [...prev, newPath]);
    setCurrentPath([]);
    setPathName('');
    
    // Clear and redraw canvas
    redrawCanvas();
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
        assetSrc: assetSrc || ''
      },
      animationStart: 0,
      animationDuration: path.duration,
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
              
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="border border-gray-600 rounded cursor-crosshair bg-white"
                style={{ maxWidth: '100%', height: 'auto' }}
              />

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
