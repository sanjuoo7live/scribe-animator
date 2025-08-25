import React from 'react';
import { useAppStore } from '../store/appStore';

interface CanvasSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const CanvasSettings: React.FC<CanvasSettingsProps> = ({ isOpen, onClose }) => {
  const { currentProject, updateProject } = useAppStore();
  // Close on Esc
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!isOpen || !currentProject) return null;

  const boardStyles = [
    { id: 'whiteboard', name: 'Whiteboard', color: '#ffffff', texture: 'none' },
    { id: 'chalkboard-dark', name: 'Chalkboard (Dark)', color: '#2d3748', texture: 'chalk' },
    { id: 'chalkboard-green', name: 'Chalkboard (Green)', color: '#2f855a', texture: 'chalk' },
    { id: 'glassboard', name: 'Glassboard', color: '#f7fafc', texture: 'glass' },
    { id: 'custom', name: 'Custom Color', color: '#e2e8f0', texture: 'none' }
  ];

  const canvasPresets = [
    { name: 'YouTube (16:9)', width: 1920, height: 1080 },
    { name: 'Square (1:1)', width: 1080, height: 1080 },
    { name: 'Vertical (9:16)', width: 1080, height: 1920 },
    { name: 'Widescreen (21:9)', width: 2560, height: 1080 },
    { name: 'HD (4:3)', width: 1440, height: 1080 }
  ];

  const updateCanvasSize = (width: number, height: number) => {
    updateProject({ width, height });
  };

  const updateBoardStyle = (styleId: string, color?: string) => {
    updateProject({ 
      boardStyle: styleId,
      backgroundColor: color 
    });
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Floating panel anchored to the right; doesn't block canvas interactions */}
      <div className="absolute top-14 right-6 bg-gray-800/98 text-white rounded-xl border border-gray-700 shadow-2xl p-6 w-[560px] max-w-[90vw] max-h-[80vh] overflow-y-auto pointer-events-auto backdrop-blur-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Canvas Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Canvas Size */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-600 pb-2">Canvas Size</h3>
          <div className="grid grid-cols-1 gap-3 mb-5">
            {canvasPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => updateCanvasSize(preset.width, preset.height)}
                className={`p-4 text-left rounded-xl border transition-all ${
                  currentProject.width === preset.width && currentProject.height === preset.height
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                    : 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold text-base mb-0.5">{preset.name}</div>
                <div className="text-sm opacity-80">{preset.width} × {preset.height} pixels</div>
              </button>
            ))}
          </div>
          
          {/* Custom Size */}
          <div className="border-t border-gray-600 pt-5">
            <div className="text-lg font-semibold text-gray-200 mb-3">Custom Size</div>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Width</label>
                <input
                  type="number"
                  placeholder="Width"
                  value={currentProject.width}
                  onChange={(e) => updateCanvasSize(Number(e.target.value), currentProject.height)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <span className="flex items-center text-gray-400 text-xl font-bold mt-6">×</span>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Height</label>
                <input
                  type="number"
                  placeholder="Height"
                  value={currentProject.height}
                  onChange={(e) => updateCanvasSize(currentProject.width, Number(e.target.value))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Board Style */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-600 pb-2">Board Style</h3>
          <div className="space-y-3">
            {boardStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => updateBoardStyle(style.id, style.color)}
                className={`p-4 rounded-xl border flex items-center gap-4 transition-all w-full ${
                  currentProject.boardStyle === style.id
                    ? 'border-blue-500 bg-blue-600 shadow-lg'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600'
                }`}
              >
                <div
                  className="w-14 h-14 rounded-xl border border-gray-500 shadow-inner"
                  style={{ backgroundColor: style.color }}
                />
                <div className="text-left">
                  <div className="font-semibold text-base text-white mb-0.5">{style.name}</div>
                  {style.texture !== 'none' && (
                    <div className="text-sm text-gray-300">with {style.texture} texture</div>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {/* Custom Color Picker */}
          {currentProject.boardStyle === 'custom' && (
            <div className="mt-5 pt-5 border-t border-gray-600">
              <label className="block text-lg font-semibold text-gray-200 mb-3">Custom Background Color</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={currentProject.backgroundColor || '#ffffff'}
                  onChange={(e) => updateProject({ backgroundColor: e.target.value })}
                  className="w-16 h-12 rounded-lg border border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={currentProject.backgroundColor || '#ffffff'}
                  onChange={(e) => updateProject({ backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="flex justify-end gap-3 pt-5 border-t border-gray-600 sticky bottom-0 bg-gray-800/98 pb-4">
          <button
            onClick={onClose}
            className="px-5 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-semibold text-sm shadow-lg"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default CanvasSettings;
