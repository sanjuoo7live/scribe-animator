import React from 'react';

interface AnimationCurveEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialCurve?: string;
  onApplyCurve: (curveName: string, customPoints?: number[]) => void;
}

interface CurvePreset {
  name: string;
  icon: string;
  description: string;
  points: number[];
  color: string;
}

const AnimationCurveEditor: React.FC<AnimationCurveEditorProps> = ({
  isOpen,
  onClose,
  initialCurve = 'ease-in-out',
  onApplyCurve,
}) => {
  const [selectedPreset, setSelectedPreset] = React.useState(initialCurve);
  const [customPoints, setCustomPoints] = React.useState<number[]>([0, 0, 1, 1]);
  const [isCustomMode, setIsCustomMode] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragPointIndex, setDragPointIndex] = React.useState(-1);

  const curvePresets: CurvePreset[] = React.useMemo(() => [
    {
      name: 'linear',
      icon: '📏',
      description: 'No acceleration',
      points: [0, 0, 1, 1],
      color: '#10B981',
    },
    {
      name: 'ease',
      icon: '🌊',
      description: 'Default easing',
      points: [0.25, 0.1, 0.25, 1],
      color: '#3B82F6',
    },
    {
      name: 'ease-in',
      icon: '🚀',
      description: 'Slow start',
      points: [0.42, 0, 1, 1],
      color: '#EF4444',
    },
    {
      name: 'ease-out',
      icon: '🛑',
      description: 'Slow end',
      points: [0, 0, 0.58, 1],
      color: '#F59E0B',
    },
    {
      name: 'ease-in-out',
      icon: '⚡',
      description: 'Smooth both ends',
      points: [0.42, 0, 0.58, 1],
      color: '#8B5CF6',
    },
    {
      name: 'bounce',
      icon: '🏀',
      description: 'Bouncy effect',
      points: [0.68, -0.55, 0.265, 1.55],
      color: '#EC4899',
    },
    {
      name: 'elastic',
      icon: '🎸',
      description: 'Spring elastic',
      points: [0.175, 0.885, 0.32, 1.275],
      color: '#06B6D4',
    },
    {
      name: 'back',
      icon: '↩️',
      description: 'Overshoot',
      points: [0.175, 0.885, 0.32, 1.2],
      color: '#84CC16',
    },
  ], []);

  // Draw curve on canvas
  React.useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw main axes
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height);
    ctx.stroke();

    // Get current curve points
    const points = isCustomMode ? customPoints : 
      curvePresets.find(p => p.name === selectedPreset)?.points || [0, 0, 1, 1];

    // Draw bezier curve
    ctx.strokeStyle = isCustomMode ? '#F59E0B' : 
      curvePresets.find(p => p.name === selectedPreset)?.color || '#8B5CF6';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    // Draw cubic bezier curve
    const cp1x = points[0] * width;
    const cp1y = height - (points[1] * height);
    const cp2x = points[2] * width;
    const cp2y = height - (points[3] * height);
    
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, width, 0);
    ctx.stroke();

    // Draw control points in custom mode
    if (isCustomMode) {
      // Control point 1
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(cp1x, cp1y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Control point 2
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(cp2x, cp2y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw control lines
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Line to control point 1
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(cp1x, cp1y);
      ctx.stroke();
      
      // Line to control point 2
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(cp2x, cp2y);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
  }, [selectedPreset, customPoints, isCustomMode, curvePresets]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCustomMode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    // Check if clicking near control points
    const cp1x = customPoints[0] * width;
    const cp1y = height - (customPoints[1] * height);
    const cp2x = customPoints[2] * width;
    const cp2y = height - (customPoints[3] * height);

    const distance1 = Math.sqrt((x - cp1x) ** 2 + (y - cp1y) ** 2);
    const distance2 = Math.sqrt((x - cp2x) ** 2 + (y - cp2y) ** 2);

    if (distance1 < 15) {
      setIsDragging(true);
      setDragPointIndex(0);
    } else if (distance2 < 15) {
      setIsDragging(true);
      setDragPointIndex(1);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !isCustomMode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    const newX = Math.max(0, Math.min(1, x / width));
    const newY = Math.max(-0.5, Math.min(1.5, 1 - (y / height)));

    const newPoints = [...customPoints];
    if (dragPointIndex === 0) {
      newPoints[0] = newX;
      newPoints[1] = newY;
    } else if (dragPointIndex === 1) {
      newPoints[2] = newX;
      newPoints[3] = newY;
    }

    setCustomPoints(newPoints);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDragPointIndex(-1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto border border-gray-600">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">🎨 Animation Curve Editor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Curve Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">📈 Curve Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCustomMode(false)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    !isCustomMode ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Presets
                </button>
                <button
                  onClick={() => setIsCustomMode(true)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    isCustomMode ? 'bg-orange-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
              <canvas
                ref={canvasRef}
                width={300}
                height={200}
                className="w-full border border-gray-600 rounded cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              
              {isCustomMode && (
                <div className="mt-3 text-sm text-gray-400">
                  💡 Drag the red and blue control points to customize your curve
                </div>
              )}
            </div>

            {/* Curve Values */}
            <div className="bg-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-medium text-white mb-2">🔢 Curve Values</h4>
              <div className="text-sm text-gray-300 font-mono">
                {isCustomMode ? (
                  <div>
                    <div>Control Point 1: ({customPoints[0].toFixed(3)}, {customPoints[1].toFixed(3)})</div>
                    <div>Control Point 2: ({customPoints[2].toFixed(3)}, {customPoints[3].toFixed(3)})</div>
                    <div className="mt-2 text-xs text-orange-400">
                      cubic-bezier({customPoints.map(p => p.toFixed(3)).join(', ')})
                    </div>
                  </div>
                ) : (
                  <div>
                    <div>Selected: {selectedPreset}</div>
                    <div className="text-xs text-blue-400 mt-1">
                      {curvePresets.find(p => p.name === selectedPreset)?.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preset Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">🎭 Animation Presets</h3>
            
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {curvePresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setSelectedPreset(preset.name);
                    setIsCustomMode(false);
                  }}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedPreset === preset.name && !isCustomMode
                      ? 'border-blue-400 bg-blue-600'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg mb-1">{preset.icon}</div>
                    <div className="text-sm font-medium text-white mb-1">{preset.name}</div>
                    
                    {/* Mini curve preview */}
                    <svg width="40" height="20" className="mx-auto mb-1" viewBox="0 0 40 20">
                      <path
                        d={`M0,20 C${preset.points[0] * 40},${20 - preset.points[1] * 20} ${preset.points[2] * 40},${20 - preset.points[3] * 20} 40,0`}
                        stroke={preset.color}
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                    
                    <div className="text-xs text-gray-400">{preset.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-gray-600">
              <button
                onClick={() => {
                  onApplyCurve(
                    isCustomMode ? 'custom' : selectedPreset,
                    isCustomMode ? customPoints : undefined
                  );
                  onClose();
                }}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium text-white transition-colors"
              >
                ✅ Apply Curve
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setCustomPoints([0, 0, 1, 1]);
                    setSelectedPreset('linear');
                    setIsCustomMode(false);
                  }}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white transition-colors"
                >
                  🔄 Reset
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      isCustomMode 
                        ? `cubic-bezier(${customPoints.map(p => p.toFixed(3)).join(', ')})`
                        : selectedPreset
                    );
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationCurveEditor;
