import React from 'react';
import { useAppStore } from '../store/appStore';

const CameraControls: React.FC = () => {
  const { currentProject, updateProject } = useAppStore();
  
  const cameraPosition = currentProject?.cameraPosition || { x: 0, y: 0, zoom: 1 };

  const updateCamera = (updates: Partial<typeof cameraPosition>) => {
    updateProject({
      cameraPosition: { ...cameraPosition, ...updates }
    });
  };

  const resetCamera = () => {
    updateProject({
      cameraPosition: { x: 0, y: 0, zoom: 1 }
    });
  };

  const zoomIn = () => {
    const newZoom = Math.min(cameraPosition.zoom * 1.2, 3);
    updateCamera({ zoom: newZoom });
  };

  const zoomOut = () => {
    const newZoom = Math.max(cameraPosition.zoom / 1.2, 0.5);
    updateCamera({ zoom: newZoom });
  };

  const panCamera = (direction: 'up' | 'down' | 'left' | 'right') => {
    const panAmount = 50;
    const updates: Partial<typeof cameraPosition> = {};
    
    switch (direction) {
      case 'up':
        updates.y = cameraPosition.y - panAmount;
        break;
      case 'down':
        updates.y = cameraPosition.y + panAmount;
        break;
      case 'left':
        updates.x = cameraPosition.x - panAmount;
        break;
      case 'right':
        updates.x = cameraPosition.x + panAmount;
        break;
    }
    
    updateCamera(updates);
  };

  return (
    <div className="bg-gray-700 p-2 rounded-lg border border-gray-600">
      <div className="flex items-center gap-2">
        {/* Zoom Controls */}
        <button
          onClick={zoomOut}
          className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
          title="Zoom Out"
        >
          🔍-
        </button>
        <span className="text-xs text-gray-300 px-1 min-w-[32px] text-center">
          {Math.round(cameraPosition.zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
          title="Zoom In"
        >
          🔍+
        </button>
        
        <div className="w-px h-4 bg-gray-500 mx-1"></div>
        
        {/* Pan Controls */}
        <button
          onClick={() => panCamera('up')}
          className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
          title="Pan Up"
        >
          ⬆️
        </button>
        <button
          onClick={() => panCamera('left')}
          className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
          title="Pan Left"
        >
          ⬅️
        </button>
        <button
          onClick={resetCamera}
          className="p-1 bg-purple-600 hover:bg-purple-500 rounded text-xs transition-colors"
          title="Reset Camera"
        >
          🎯
        </button>
        <button
          onClick={() => panCamera('right')}
          className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
          title="Pan Right"
        >
          ➡️
        </button>
        <button
          onClick={() => panCamera('down')}
          className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
          title="Pan Down"
        >
          ⬇️
        </button>
      </div>
    </div>
  );
};

export default CameraControls;
