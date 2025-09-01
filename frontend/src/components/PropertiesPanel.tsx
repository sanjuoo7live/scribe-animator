import React from 'react';
import { useAppStore } from '../store/appStore';

const PropertiesPanel: React.FC = () => {
  const { currentProject, selectedObject, updateObject, moveObjectLayer } = useAppStore();
  // Local UI state for motion path utilities
  const [motionTargetId, setMotionTargetId] = React.useState<string>('');
  const [pathJsonInput, setPathJsonInput] = React.useState<string>('');
  
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
      case 'svg':
        // SVG objects should only have 'none' animation by default
        return ['none'];
      case 'svgPath':
        // SVG path objects should only have drawIn animation for hand drawing effect
        return ['none', 'drawIn'];
      case 'icon':
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
  // Special handling for SVG objects - always set to 'none'
  React.useEffect(() => {
    if (!selectedObj) return;
    
    const currentAnimationType = selectedObj.animationType || 'none';
    
    // Special case for SVG objects - default to 'drawIn' for hand drawing animation
    if (selectedObj.type === 'svgPath') {
      if (currentAnimationType !== 'drawIn' && currentAnimationType !== 'none') {
        updateObjectProperty('animationType', 'drawIn');
      }
      // Also set easing to 'linear' for SVG objects (most neutral)
      if ((selectedObj.animationEasing || 'easeOut') !== 'linear') {
        updateObjectProperty('animationEasing', 'linear');
      }
      return;
    }
    
    // For other objects, reset if current animation type is not available
    if (!availableAnimationTypes.includes(currentAnimationType)) {
      updateObjectProperty('animationType', 'none');
    }
  }, [selectedObj, selectedObj?.animationType, selectedObj?.animationEasing, availableAnimationTypes, updateObjectProperty]);

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
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
                <option value="Arial, 'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Symbol'">Arial + Emoji Fallback</option>
                <option value="'Noto Sans', 'Noto Emoji', 'Noto Sans Symbols', Arial">Noto (broad glyphs)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Custom Font Family (optional)</label>
              <input
                type="text"
                value={selectedObj.properties.fontFamilyCustom || ''}
                onChange={(e) => updateProperty('fontFamilyCustom', e.target.value)}
                placeholder="e.g. Inter, 'Apple Color Emoji', sans-serif"
                className="w-full p-2 bg-gray-700 text-white rounded text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-1">Overrides the dropdown if provided. Use to include emoji/symbol fallbacks.</p>
            </div>
          </div>
        </div>
      )}

      {/* Path Follow for Text/Image */}
      {(selectedObj.type === 'text' || selectedObj.type === 'image') && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Path Follow</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                onClick={() => updateObjectProperty('animationType', 'pathFollow')}
              >Enable Path Follow</button>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={!!selectedObj.properties?.rotateWithPath}
                  onChange={(e) => updateProperty('rotateWithPath', e.target.checked)}
                />
                Rotate with path
              </label>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Path Points (JSON array of {`{x,y}`})</label>
              <textarea
                value={pathJsonInput !== '' ? pathJsonInput : JSON.stringify(selectedObj.properties?.pathPoints || [], null, 0)}
                onChange={(e) => setPathJsonInput(e.target.value)}
                onBlur={() => {
                  try {
                    const parsed = JSON.parse(pathJsonInput || '[]');
                    if (Array.isArray(parsed)) {
                      updateProperty('pathPoints', parsed);
                    }
                  } catch (_) {
                    // ignore parse errors, keep old value
                  } finally {
                    setPathJsonInput('');
                  }
                }}
                className="w-full p-2 bg-gray-700 text-white rounded text-xs h-20 font-mono"
                placeholder='e.g. [{"x":0,"y":0},{"x":100,"y":50}]'
              />
              <div className="flex gap-2 mt-2">
                <button
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                  onClick={() => updateProperty('pathPoints', [])}
                >Clear Path</button>
                <button
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                  onClick={() => updateProperty('pathPoints', [
                    { x: selectedObj.x, y: selectedObj.y },
                    { x: (selectedObj.x || 0) + (selectedObj.width || 100), y: selectedObj.y || 0 }
                  ])}
                >Create Simple Line</button>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">Tip: Use "Make motion path" on a drawn path to auto-fill these points.</p>
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

      {/* Draw Path Utilities */}
      {selectedObj.type === 'drawPath' && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Motion Path</h4>
          <p className="text-[11px] text-gray-400 mb-2">Copy this drawn path as a motion path (pathFollow) onto another object.</p>
          <div className="space-y-2">
            <label className="block text-xs text-gray-400">Target Object</label>
            <select
              value={motionTargetId}
              onChange={(e) => setMotionTargetId(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded text-sm"
            >
              <option value="">— Choose target —</option>
              {(currentProject?.objects || [])
                .filter(o => o.id !== selectedObj.id && (o.type === 'text' || o.type === 'image'))
                .map(o => (
                  <option key={o.id} value={o.id}>{o.type} • {o.id.slice(0, 8)}</option>
                ))}
            </select>
            <div className="flex gap-2">
              <button
                disabled={!motionTargetId}
                className={`px-3 py-1 rounded text-xs ${motionTargetId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                onClick={() => {
                  if (!currentProject || !motionTargetId) return;
                  const target = currentProject.objects.find(o => o.id === motionTargetId);
                  if (!target) return;
                  // Collect points from this drawPath
                  const hasSegments = Array.isArray(selectedObj.properties?.segments) && selectedObj.properties.segments.length > 0;
                  const segs: { x: number; y: number }[][] = hasSegments ? selectedObj.properties.segments : [selectedObj.properties.points || []];
                  const absPoints = segs.flat().map((p: any) => ({ x: (selectedObj.x || 0) + p.x, y: (selectedObj.y || 0) + p.y }));
                  // Update target with motion path
                  const newProps = { ...(target.properties || {}), pathPoints: absPoints, rotateWithPath: target.properties?.rotateWithPath ?? true };
                  updateObject(target.id, {
                    properties: newProps,
                    animationType: 'pathFollow',
                  } as any);
                }}
              >Make motion path for selection</button>
              <button
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                onClick={() => setMotionTargetId('')}
              >Reset</button>
            </div>
            <p className="text-[11px] text-gray-500">Points are copied in absolute canvas coordinates and set on the target&apos;s properties.pathPoints.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
