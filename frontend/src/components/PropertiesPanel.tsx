import React from 'react';
import { useAppStore } from '../store/appStore';

const PropertiesPanel: React.FC = () => {
  const { currentProject, selectedObject, updateObject, moveObjectLayer } = useAppStore();
  
  const selectedObj = currentProject?.objects.find(obj => obj.id === selectedObject);

  const updateObjectProperty = React.useCallback((property: string, value: any) => {
    if (!selectedObj) return;
    updateObject(selectedObj.id, { [property]: value });
  }, [updateObject, selectedObj]);

  // Get available animation types based on object type
  const getAvailableAnimationTypes = React.useCallback((objType: string) => {
    const baseTypes = ['none', 'fadeIn', 'slideIn', 'scaleIn'];
    
    switch (objType) {
      case 'text':
        return [...baseTypes, 'drawIn', 'pathFollow', 'typewriter'];
      case 'shape':
        return [...baseTypes, 'drawIn', 'pathFollow'];
      case 'drawPath':
        return [...baseTypes, 'drawIn', 'pathFollow'];
      case 'image':
        return [...baseTypes, 'drawIn', 'pathFollow'];
      case 'icon':
      case 'svg':
        return [...baseTypes, 'drawIn', 'pathFollow'];
      case 'hand':
      case 'character':
      case 'prop':
        return [...baseTypes, 'drawIn', 'pathFollow'];
      default:
        return baseTypes;
    }
  }, []);

  const availableAnimationTypes = React.useMemo(() => {
    return selectedObj ? getAvailableAnimationTypes(selectedObj.type) : ['none'];
  }, [selectedObj, getAvailableAnimationTypes]);

  // Reset animation type to 'none' if current type is not available for this object type
  React.useEffect(() => {
    if (!selectedObj) return;
    
    const currentAnimationType = selectedObj.animationType || 'none';
    if (!availableAnimationTypes.includes(currentAnimationType)) {
      updateObjectProperty('animationType', 'none');
    }
  }, [selectedObj, selectedObj?.animationType, availableAnimationTypes, updateObjectProperty]);

  if (!selectedObj) {
    return (
      <div className="h-full p-4">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">Properties</h3>
        <p className="text-gray-500 text-sm">Select an object to edit its properties</p>
      </div>
    );
  }

  const updateProperty = (path: string, value: any) => {
    const newProperties = { ...selectedObj.properties };
    
    if (path.includes('.')) {
      const keys = path.split('.');
      let current = newProperties;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    } else {
      newProperties[path] = value;
    }

    updateObject(selectedObj.id, { properties: newProperties });
  };

  return (
    <div className="h-full p-4 bg-gray-800 text-white overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-300 mb-4">Properties</h3>
      
      {/* Object Info */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Object Info</h4>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <input
              type="text"
              value={selectedObj.type}
              readOnly
              className="w-full p-2 bg-gray-700 text-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">ID</label>
            <input
              type="text"
              value={selectedObj.id}
              readOnly
              className="w-full p-2 bg-gray-700 text-gray-300 rounded text-sm text-xs"
            />
          </div>
        </div>
      </div>

      {/* Position */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Position</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">X</label>
            <input
              type="number"
              value={selectedObj.x}
              onChange={(e) => updateObjectProperty('x', Number(e.target.value))}
              className="w-full p-2 bg-gray-700 text-white rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Y</label>
            <input
              type="number"
              value={selectedObj.y}
              onChange={(e) => updateObjectProperty('y', Number(e.target.value))}
              className="w-full p-2 bg-gray-700 text-white rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Size (for shapes) */}
      {selectedObj.type === 'shape' && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Size</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Width</label>
              <input
                type="number"
                value={selectedObj.width || 100}
                onChange={(e) => updateObjectProperty('width', Number(e.target.value))}
                className="w-full p-2 bg-gray-700 text-white rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Height</label>
              <input
                type="number"
                value={selectedObj.height || 100}
                onChange={(e) => updateObjectProperty('height', Number(e.target.value))}
                className="w-full p-2 bg-gray-700 text-white rounded text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Shape Properties */}
      {selectedObj.type === 'shape' && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Appearance</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fill Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedObj.properties.fill === 'transparent' ? '#ffffff' : selectedObj.properties.fill || '#ffffff'}
                  onChange={(e) => updateProperty('fill', e.target.value)}
                  className="w-8 h-8 rounded border border-gray-600"
                />
                <button
                  onClick={() => updateProperty('fill', 'transparent')}
                  className="px-2 py-1 bg-gray-600 text-xs rounded hover:bg-gray-500"
                >
                  Transparent
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stroke Color</label>
              <input
                type="color"
                value={selectedObj.properties.stroke || '#000000'}
                onChange={(e) => updateProperty('stroke', e.target.value)}
                className="w-8 h-8 rounded border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stroke Width</label>
              <input
                type="range"
                min="0"
                max="20"
                value={selectedObj.properties.strokeWidth || 2}
                onChange={(e) => updateProperty('strokeWidth', Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-400">{selectedObj.properties.strokeWidth || 2}px</span>
            </div>
          </div>
        </div>
      )}

      {/* Text Properties */}
      {selectedObj.type === 'text' && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Text Properties</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Text</label>
              <textarea
                value={selectedObj.properties.text || ''}
                onChange={(e) => updateProperty('text', e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded text-sm h-16 resize-none"
                placeholder="Enter text..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Font Size</label>
              <input
                type="range"
                min="8"
                max="72"
                value={selectedObj.properties.fontSize || 16}
                onChange={(e) => updateProperty('fontSize', Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-400">{selectedObj.properties.fontSize || 16}px</span>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Color</label>
              <input
                type="color"
                value={selectedObj.properties.fill || '#000000'}
                onChange={(e) => updateProperty('fill', e.target.value)}
                className="w-8 h-8 rounded border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Font Family</label>
              <select
                value={selectedObj.properties.fontFamily || 'Arial'}
                onChange={(e) => updateProperty('fontFamily', e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded text-sm"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Layer Management */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Layer Order</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => moveObjectLayer(selectedObj.id, 'front')}
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded text-xs"
          >
            🔝 Bring to Front
          </button>
          <button
            onClick={() => moveObjectLayer(selectedObj.id, 'back')}
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded text-xs"
          >
            📤 Send to Back
          </button>
          <button
            onClick={() => moveObjectLayer(selectedObj.id, 'forward')}
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded text-xs"
          >
            ⬆️ Bring Forward
          </button>
          <button
            onClick={() => moveObjectLayer(selectedObj.id, 'backward')}
            className="p-2 bg-gray-600 hover:bg-gray-500 rounded text-xs"
          >
            ⬇️ Send Backward
          </button>
        </div>
      </div>

      {/* Animation Properties */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Animation</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Time (seconds)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={selectedObj.animationStart || 0}
              onChange={(e) => updateObjectProperty('animationStart', Number(e.target.value))}
              className="w-full p-2 bg-gray-700 text-white rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Duration (seconds)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={selectedObj.animationDuration || 5}
              onChange={(e) => updateObjectProperty('animationDuration', Number(e.target.value))}
              className="w-full p-2 bg-gray-700 text-white rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Animation Type</label>
            <select
              value={selectedObj.animationType || 'none'}
              onChange={(e) => updateObjectProperty('animationType', e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded text-sm"
            >
              {availableAnimationTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'none' ? 'None' :
                   type === 'fadeIn' ? 'Fade In' :
                   type === 'slideIn' ? 'Slide In' :
                   type === 'scaleIn' ? 'Scale In' :
                   type === 'drawIn' ? 'Draw In' :
                   type === 'pathFollow' ? 'Path Follow' :
                   type === 'typewriter' ? 'Typewriter' :
                   type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Easing</label>
            <select
              value={selectedObj.animationEasing || 'easeOut'}
              onChange={(e) => updateObjectProperty('animationEasing', e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded text-sm"
            >
              <option value="linear">Linear</option>
              <option value="easeIn">Ease In</option>
              <option value="easeOut">Ease Out</option>
              <option value="easeInOut">Ease In Out</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
