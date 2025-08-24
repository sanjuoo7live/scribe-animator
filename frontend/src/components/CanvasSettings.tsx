import React from 'react';
import { useAppStore } from '../store/appStore';

interface CanvasSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const CanvasSettings: React.FC<CanvasSettingsProps> = ({ isOpen, onClose }) => {
  const { currentProject, updateProject } = useAppStore();

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white rounded-lg shadow-xl p-8 w-[800px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-white">Canvas Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Canvas Size */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold text-gray-200 mb-6 border-b border-gray-600 pb-2">Canvas Size</h3>
          <div className="grid grid-cols-1 gap-4 mb-6">
            {canvasPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => updateCanvasSize(preset.width, preset.height)}
                className={`p-5 text-left rounded-xl border-2 transition-all ${
                  currentProject.width === preset.width && currentProject.height === preset.height
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg transform scale-105'
                    : 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:border-gray-500 hover:transform hover:scale-102'
                }`}
              >
                <div className="font-bold text-xl mb-1">{preset.name}</div>
                <div className="text-lg opacity-80">{preset.width} × {preset.height} pixels</div>
              </button>
            ))}
          </div>
          
          {/* Custom Size */}
          <div className="border-t border-gray-600 pt-6">
            <div className="text-xl font-semibold text-gray-200 mb-4">Custom Size</div>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-lg font-medium text-gray-300 mb-2">Width</label>
                <input
                  type="number"
                  placeholder="Width"
                  value={currentProject.width}
                  onChange={(e) => updateCanvasSize(Number(e.target.value), currentProject.height)}
                  className="w-full p-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white text-lg focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <span className="flex items-center text-gray-400 text-2xl font-bold mt-8">×</span>
              <div className="flex-1">
                <label className="block text-lg font-medium text-gray-300 mb-2">Height</label>
                <input
                  type="number"
                  placeholder="Height"
                  value={currentProject.height}
                  onChange={(e) => updateCanvasSize(currentProject.width, Number(e.target.value))}
                  className="w-full p-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white text-lg focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Board Style */}
        <div className="mb-10">
          <h3 className="text-2xl font-semibold text-gray-200 mb-6 border-b border-gray-600 pb-2">Board Style</h3>
          <div className="space-y-4">
            {boardStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => updateBoardStyle(style.id, style.color)}
                className={`p-5 rounded-xl border-2 flex items-center gap-5 transition-all w-full ${
                  currentProject.boardStyle === style.id
                    ? 'border-blue-500 bg-blue-600 shadow-lg transform scale-105'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600 hover:transform hover:scale-102'
                }`}
              >
                <div
                  className="w-16 h-16 rounded-xl border-2 border-gray-500 shadow-inner"
                  style={{ backgroundColor: style.color }}
                />
                <div className="text-left">
                  <div className="font-bold text-xl text-white mb-1">{style.name}</div>
                  {style.texture !== 'none' && (
                    <div className="text-lg text-gray-300">with {style.texture} texture</div>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {/* Custom Color Picker */}
          {currentProject.boardStyle === 'custom' && (
            <div className="mt-6 pt-6 border-t border-gray-600">
              <label className="block text-xl font-semibold text-gray-200 mb-4">Custom Background Color</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={currentProject.backgroundColor || '#ffffff'}
                  onChange={(e) => updateProject({ backgroundColor: e.target.value })}
                  className="w-20 h-16 rounded-xl border-2 border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={currentProject.backgroundColor || '#ffffff'}
                  onChange={(e) => updateProject({ backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1 p-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white text-lg focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-600">
          <button
            onClick={onClose}
            className="px-8 py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-500 transition-colors text-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold text-lg shadow-lg"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default CanvasSettings;
