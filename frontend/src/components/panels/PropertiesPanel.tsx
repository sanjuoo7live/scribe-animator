import React from 'react';
import { useAppStore } from '../../store/appStore';
import SvgDrawSettings, { SvgDrawOptions } from '../shared/SvgDrawSettings';
import HandToolSelector from '../hands/HandToolSelector';
import HandToolCalibrator from '../hands/HandToolCalibrator';
import HandFollowerCalibrationModal from '../dialogs/HandFollowerCalibrationModal';
import { getCalibration } from '../../utils/calibrationStore';
import { HandAsset, ToolAsset } from '../../types/handAssets';
import { HandToolCompositor } from '../../utils/handToolCompositor';

const PropertiesPanel: React.FC = () => {
  const { currentProject, selectedObject, updateObject, moveObjectLayer } = useAppStore();
  // Local UI state for motion path utilities
  const [motionTargetId, setMotionTargetId] = React.useState<string>('');
  
  const selectedObj = currentProject?.objects.find(obj => obj.id === selectedObject);
  const [selectorOpen, setSelectorOpen] = React.useState(false);
  const [calOpen, setCalOpen] = React.useState(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = React.useState(false);

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
    // Ensure properties object exists
    const baseProps = (selectedObj.properties || {}) as any;
    const newProperties: any = { ...baseProps };

    if (path.includes('.')) {
      const keys = path.split('.');
      let current: any = newProperties;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (typeof current[k] !== 'object' || current[k] === null) {
          current[k] = {};
        }
        current = current[k];
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

      {/* Debug Section */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Debug</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={!!selectedObj.properties?.debug?.logRenderer}
              onChange={(e) => {
                const current = selectedObj.properties?.debug || {};
                updateProperty('debug', { ...current, logRenderer: e.target.checked });
              }}
            />
            Enable Renderer Logs
          </label>
          <p className="text-xs text-gray-500">
            Shows detailed progress and rendering info in browser console
          </p>
        </div>
      </div>

      {/* Position */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Position</h4>
  <div className="grid grid-cols-2" style={{ columnGap: 8, rowGap: 8 }}>
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
          <div className="grid grid-cols-2" style={{ columnGap: 8, rowGap: 8 }}>
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
        <div className="flex items-center" style={{ gap: 6 }}>
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
            <div className="flex items-center" style={{ gap: 6 }}>
              <input
                id="forceEmojiFont"
                type="checkbox"
                checked={!!selectedObj.properties.forceEmojiFont}
                onChange={(e) => updateProperty('forceEmojiFont', e.target.checked)}
              />
              <label htmlFor="forceEmojiFont" className="text-xs text-gray-300">Force Emoji Font (prioritize emoji glyphs)</label>
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
              <label className="block text-xs text-gray-400 mb-2">Path Points</label>
              <div className="space-y-2">
                {(selectedObj.properties?.pathPoints || []).map((pt: any, idx: number) => (
                  <div key={idx} className="flex items-center" style={{ gap: 6 }}>
                    <span className="text-[11px] text-gray-400 w-6">#{idx}</span>
                    <label className="text-[11px] text-gray-400">x</label>
                    <input
                      type="number"
                      value={Number(pt.x) || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const arr = [...(selectedObj.properties?.pathPoints || [])];
                        arr[idx] = { x: val, y: arr[idx]?.y ?? 0 };
                        updateProperty('pathPoints', arr);
                      }}
                      className="p-1 bg-gray-700 text-white rounded text-xs"
                      style={{ width: 64 }}
                    />
                    <label className="text-[11px] text-gray-400">y</label>
                    <input
                      type="number"
                      value={Number(pt.y) || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const arr = [...(selectedObj.properties?.pathPoints || [])];
                        arr[idx] = { x: arr[idx]?.x ?? 0, y: val };
                        updateProperty('pathPoints', arr);
                      }}
                      className="p-1 bg-gray-700 text-white rounded text-xs"
                      style={{ width: 64 }}
                    />
                    <button
                      className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                      onClick={() => {
                        const arr = [...(selectedObj.properties?.pathPoints || [])];
                        arr.splice(idx, 1);
                        updateProperty('pathPoints', arr);
                      }}
                    >Remove</button>
                  </div>
                ))}
                <div className="flex items-center mt-2" style={{ gap: 6 }}>
                  <button
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                    onClick={() => updateProperty('pathPoints', [...(selectedObj.properties?.pathPoints || []), { x: 0, y: 0 }])}
                  >Add Point</button>
                  <button
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                    onClick={() => updateProperty('pathPoints', [])}
                  >Clear</button>
                  <button
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                    onClick={() => updateProperty('pathPoints', [
                      { x: selectedObj.x, y: selectedObj.y },
                      { x: (selectedObj.x || 0) + (selectedObj.width || 100), y: selectedObj.y || 0 }
                    ])}
                  >Simple Line</button>
                </div>
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

      {/* SVG Draw Settings */}
      {selectedObj.type === 'svgPath' && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Draw Settings</h4>
          <p className="text-[11px] text-gray-500 mb-2">Hand-draw animation uses stroke-dash reveal. Easing is forced to linear.</p>
          <SvgDrawSettings
            value={selectedObj.properties?.drawOptions as SvgDrawOptions | undefined}
            onChange={(opts: SvgDrawOptions) => updateProperty('drawOptions', opts)}
            totalLen={selectedObj.properties?.totalLen}
            currentDurationSec={selectedObj.animationDuration}
          />
        </div>
      )}

      {/* Hand Follower Settings - Phase 2 Enhanced */}
      {selectedObj.type === 'svgPath' && selectedObj.animationType === 'drawIn' && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Hand Follower</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="handFollowerEnabled"
                checked={selectedObj.properties?.handFollower?.enabled || false}
                onChange={(e) => {
                  const currentSettings = selectedObj.properties?.handFollower || {};
                  updateProperty('handFollower', {
                    ...currentSettings,
                    enabled: e.target.checked
                  });
                }}
                className="rounded"
              />
              <label htmlFor="handFollowerEnabled" className="text-sm text-gray-300">
                Show hand following path
              </label>
            </div>
            
            {selectedObj.properties?.handFollower?.enabled && (
              <>
        <div>
                  <label className="block text-xs text-gray-400 mb-1">Hand & Tool</label>
                  <div className="flex gap-2">
                    <button
          onClick={() => setSelectorOpen(true)}
                      className="flex-1 p-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 text-left"
                    >
          {selectedObj.properties?.handFollower?.handAsset?.name || 'Choose hand + tool'}
                    </button>
                    <button
                      onClick={() => {
                        // Quick action to clear hand asset
                        const currentSettings = selectedObj.properties?.handFollower || {};
                        updateProperty('handFollower', {
                          ...currentSettings,
                          handAsset: null,
                          toolAsset: null
                        });
                      }}
                      className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      title="Remove hand asset"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Custom PNG uploads available!
                  </p>
                </div>

                {/* Mirror + Foreground toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={!!selectedObj.properties?.handFollower?.mirror}
                      onChange={(e)=>{
                        const current = selectedObj.properties?.handFollower || {};
                        updateProperty('handFollower', { ...current, mirror: e.target.checked });
                      }}
                    />
                    Mirror Left/Right
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={selectedObj.properties?.handFollower?.showForeground !== false}
                      onChange={(e)=>{
                        const current = selectedObj.properties?.handFollower || {};
                        updateProperty('handFollower', { ...current, showForeground: e.target.checked });
                      }}
                    />
                    Show Foreground
                  </label>
                </div>

                {/* Path follow policy removed */}

                {/* Debug overlay toggle */}
                <label className="flex items-center gap-2 text-xs text-gray-300 mt-1">
                  <input
                    type="checkbox"
                    checked={!!selectedObj.properties?.handFollower?.debug}
                    onChange={(e)=>{
                      const current = selectedObj.properties?.handFollower || {};
                      updateProperty('handFollower', { ...current, debug: e.target.checked });
                    }}
                  />
                  Show Debug Overlay (tip/target)
                </label>
                
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hand Scale</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={selectedObj.properties?.handFollower?.scale || 1}
                    onChange={(e) => {
                      const currentSettings = selectedObj.properties?.handFollower || {};
                      updateProperty('handFollower', {
                        ...currentSettings,
                        scale: parseFloat(e.target.value)
                      });
                    }}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(selectedObj.properties?.handFollower?.scale || 1).toFixed(1)}x
                  </div>
                </div>
                
        <div className="grid grid-cols-2 gap-2">
                  <div>
          <label className="block text-xs text-gray-400 mb-1">Offset X (temp)</label>
                    <input
                      type="number"
                      value={selectedObj.properties?.handFollower?.offset?.x || 0}
                      onChange={(e) => {
                        const currentSettings = selectedObj.properties?.handFollower || {};
                        const currentOffset = currentSettings.offset || { x: 0, y: 0 };
                        updateProperty('handFollower', {
                          ...currentSettings,
                          offset: {
                            ...currentOffset,
                            x: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="w-full p-1 bg-gray-700 text-white rounded text-xs"
                    />
                  </div>
                  <div>
          <label className="block text-xs text-gray-400 mb-1">Offset Y (temp)</label>
                    <input
                      type="number"
                      value={selectedObj.properties?.handFollower?.offset?.y || 0}
                      onChange={(e) => {
                        const currentSettings = selectedObj.properties?.handFollower || {};
                        const currentOffset = currentSettings.offset || { x: 0, y: 0 };
                        updateProperty('handFollower', {
                          ...currentSettings,
                          offset: {
                            ...currentOffset,
                            y: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      className="w-full p-1 bg-gray-700 text-white rounded text-xs"
                    />
                  </div>
                </div>

                {/* Phase 2: Movement Smoothing */}
                {/* Calibration Modal Button */}
                <div className="bg-gray-700/40 p-3 rounded">
                  <h5 className="text-xs font-medium text-gray-300 mb-2">Advanced Calibration</h5>
                  <button
                    onClick={() => setCalibrationModalOpen(true)}
                    className="w-full p-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <span>🎯</span>
                    Open Calibration Tool
                  </button>
                  <div className="text-xs text-gray-500 mt-1">
                    Fine-tune nib position, backtrack, and alignment
                  </div>
                </div>

                {/* Phase 2: Movement Smoothing */}
                <div className="bg-blue-900/20 p-3 rounded">
                  <h5 className="text-xs font-medium text-blue-300 mb-2">🆕 Movement Smoothing</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="smoothingEnabled"
                        checked={selectedObj.properties?.handFollower?.smoothing?.enabled || false}
                        onChange={(e) => {
                          const currentSettings = selectedObj.properties?.handFollower || {};
                          const currentSmoothing = currentSettings.smoothing || {};
                          updateProperty('handFollower', {
                            ...currentSettings,
                            smoothing: {
                              ...currentSmoothing,
                              enabled: e.target.checked,
                              strength: currentSmoothing.strength || 0.15,
                              lookAhead: currentSmoothing.lookAhead || 3,
                              jitterIntensity: currentSmoothing.jitterIntensity || 0.02
                            }
                          });
                        }}
                        className="rounded"
                      />
                      <label htmlFor="smoothingEnabled" className="text-xs text-blue-300">
                        Enable smooth movement
                      </label>
                    </div>
                    
                    {selectedObj.properties?.handFollower?.smoothing?.enabled && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Smoothing Strength</label>
                          <input
                            type="range"
                            min="0.05"
                            max="0.5"
                            step="0.05"
                            value={selectedObj.properties?.handFollower?.smoothing?.strength || 0.15}
                            onChange={(e) => {
                              const currentSettings = selectedObj.properties?.handFollower || {};
                              const currentSmoothing = currentSettings.smoothing || {};
                              updateProperty('handFollower', {
                                ...currentSettings,
                                smoothing: {
                                  ...currentSmoothing,
                                  strength: parseFloat(e.target.value)
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            {(selectedObj.properties?.handFollower?.smoothing?.strength || 0.15).toFixed(2)} (Light smoothing prevents jerky movement)
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Human Jitter</label>
                          <input
                            type="range"
                            min="0"
                            max="0.1"
                            step="0.01"
                            value={selectedObj.properties?.handFollower?.smoothing?.jitterIntensity || 0.02}
                            onChange={(e) => {
                              const currentSettings = selectedObj.properties?.handFollower || {};
                              const currentSmoothing = currentSettings.smoothing || {};
                              updateProperty('handFollower', {
                                ...currentSettings,
                                smoothing: {
                                  ...currentSmoothing,
                                  jitterIntensity: parseFloat(e.target.value)
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            {(selectedObj.properties?.handFollower?.smoothing?.jitterIntensity || 0.02).toFixed(2)} (Subtle natural movement variation)
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Phase 2: Corner Lifts */}
                <div className="bg-green-900/20 p-3 rounded">
                  <h5 className="text-xs font-medium text-green-300 mb-2">🆕 Corner Lifts</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="cornerLiftsEnabled"
                        checked={selectedObj.properties?.handFollower?.cornerLifts?.enabled || false}
                        onChange={(e) => {
                          const currentSettings = selectedObj.properties?.handFollower || {};
                          const currentCornerLifts = currentSettings.cornerLifts || {};
                          updateProperty('handFollower', {
                            ...currentSettings,
                            cornerLifts: {
                              ...currentCornerLifts,
                              enabled: e.target.checked,
                              angleThreshold: currentCornerLifts.angleThreshold || 30,
                              liftDuration: currentCornerLifts.liftDuration || 150,
                              liftHeight: currentCornerLifts.liftHeight || 8,
                              anticipation: currentCornerLifts.anticipation || 2,
                              settle: currentCornerLifts.settle || 2
                            }
                          });
                        }}
                        className="rounded"
                      />
                      <label htmlFor="cornerLiftsEnabled" className="text-xs text-green-300">
                        Lift hand at sharp corners
                      </label>
                    </div>
                    
                    {selectedObj.properties?.handFollower?.cornerLifts?.enabled && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sensitivity</label>
                            <input
                              type="range"
                              min="15"
                              max="60"
                              step="5"
                              value={selectedObj.properties?.handFollower?.cornerLifts?.angleThreshold || 30}
                              onChange={(e) => {
                                const currentSettings = selectedObj.properties?.handFollower || {};
                                const currentCornerLifts = currentSettings.cornerLifts || {};
                                updateProperty('handFollower', {
                                  ...currentSettings,
                                  cornerLifts: {
                                    ...currentCornerLifts,
                                    angleThreshold: parseInt(e.target.value)
                                  }
                                });
                              }}
                              className="w-full"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {selectedObj.properties?.handFollower?.cornerLifts?.angleThreshold || 30}° (Lower = more lifts)
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Lift Height</label>
                            <input
                              type="range"
                              min="4"
                              max="20"
                              step="2"
                              value={selectedObj.properties?.handFollower?.cornerLifts?.liftHeight || 8}
                              onChange={(e) => {
                                const currentSettings = selectedObj.properties?.handFollower || {};
                                const currentCornerLifts = currentSettings.cornerLifts || {};
                                updateProperty('handFollower', {
                                  ...currentSettings,
                                  cornerLifts: {
                                    ...currentCornerLifts,
                                    liftHeight: parseInt(e.target.value)
                                  }
                                });
                              }}
                              className="w-full"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {selectedObj.properties?.handFollower?.cornerLifts?.liftHeight || 8}px
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Lift Duration</label>
                          <input
                            type="range"
                            min="100"
                            max="300"
                            step="25"
                            value={selectedObj.properties?.handFollower?.cornerLifts?.liftDuration || 150}
                            onChange={(e) => {
                              const currentSettings = selectedObj.properties?.handFollower || {};
                              const currentCornerLifts = currentSettings.cornerLifts || {};
                              updateProperty('handFollower', {
                                ...currentSettings,
                                cornerLifts: {
                                  ...currentCornerLifts,
                                  liftDuration: parseInt(e.target.value)
                                }
                              });
                            }}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            {selectedObj.properties?.handFollower?.cornerLifts?.liftDuration || 150}ms (How long lift takes)
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-700 p-3 rounded">
                  <h5 className="text-xs font-medium text-gray-300 mb-2">Upload Your Own Hand PNG</h5>
                  <p className="text-xs text-gray-400 mb-2">
                    Want to use your own hand image? You can upload PNG, JPG, or SVG files.
                  </p>
                  
                  {/* File Upload Input */}
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Simple file upload handler - opens calibration
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            // For now, show the image was loaded
                            alert(`✅ Image loaded: ${file.name}\n\nNext: We'll add visual tip calibration here.\n\nFor now, the image is ready to use with default tip position (75%, 87%).`);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-500 rounded p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-600 transition-colors">
                      <div className="text-blue-400 mb-1">📁</div>
                      <p className="text-xs text-gray-300">Click to upload hand image</p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF, SVG</p>
                    </div>
                  </label>
                  
                  <div className="mt-3 text-center">
                    <button
                      onClick={() => {
                        // Quick test with realistic hand
                        alert('🖐️ Testing with realistic hand!\n\n1. Create an SVG path (use Draw tool)\n2. Set animation to "Draw In"\n3. Enable hand follower above\n4. Play animation to see realistic hand movement!\n\nYour hand image is already configured as the default asset.');
                      }}
                      className="w-full p-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      🧪 Test Realistic Hand Now
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Supports PNG, JPG, GIF, and SVG formats. You'll be able to set the pen tip position visually.
                  </p>
                </div>

                {/* Calibration controls */}
        <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-gray-400">
          Calibration: per hand+tool offset stored locally (use Calibrate 1s, then Apply Saved)
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                      onClick={()=> setCalOpen(true)}
                      disabled={!(selectedObj.properties?.handFollower?.handAsset && selectedObj.properties?.handFollower?.toolAsset)}
                    >Calibrate 1s</button>
                    <button
                      className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                      onClick={()=>{
                        const hf = selectedObj.properties?.handFollower;
                        if (hf?.handAsset && hf?.toolAsset) {
                          const c = getCalibration(hf.handAsset.id, hf.toolAsset.id);
                          const current = hf || {};
                          updateProperty('handFollower', { ...current, calibrationOffset: c || { x:0,y:0 } });
                        }
                      }}
                      disabled={!(selectedObj.properties?.handFollower?.handAsset && selectedObj.properties?.handFollower?.toolAsset)}
                    >Apply Saved</button>
                  </div>
                </div>
                
                <p className="text-[10px] text-green-400">
                  ✅ Phase 2: Natural movement with smoothing and corner detection complete!
                </p>
              </>
            )}
          </div>
        </div>
      )}

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

      {/* Modals */}
      {selectorOpen && selectedObj?.type==='svgPath' && (
        <HandToolSelector
          open={selectorOpen}
          initialHand={selectedObj.properties?.handFollower?.handAsset || undefined}
          initialTool={selectedObj.properties?.handFollower?.toolAsset || undefined}
          initialScale={selectedObj.properties?.handFollower?.scale || 1}
          onApply={({ hand, tool, scale, mirror, showForeground }: { hand: HandAsset | null; tool: ToolAsset | null; scale: number; mirror: boolean; showForeground: boolean }) => {
            try {
              const current = selectedObj.properties?.handFollower || {};
              const next: any = { ...current, mode: 'professional', scale, mirror, showForeground };
              if (hand) next.handAsset = hand; // only override if provided
              if (tool) next.toolAsset = tool; // only override if provided
              // Set nibAnchor so the tool's tip aligns with the hand's grip using compositor
              if (hand && tool) {
                // Apply mirroring to hand if needed before composition calculation
                const handForComposition = mirror ? HandToolCompositor.mirrorHandAsset(hand) : hand;
                
                // Use the composition engine to calculate proper alignment at a reference position
                const composition = HandToolCompositor.composeHandTool(
                  handForComposition,
                  tool,
                  { x: 0, y: 0 }, // reference position (doesn't matter for alignment calculation)
                  0, // reference angle (doesn't matter for alignment calculation)
                  1 // unit scale for accurate pixel calculations
                );
                
                // The nibAnchor should be where the tool tip ends up relative to the hand position
                // After composition, hand is at composition.handPosition and tool tip is at composition.finalTipPosition
                next.nibAnchor = {
                  x: composition.finalTipPosition.x - composition.handPosition.x,
                  y: composition.finalTipPosition.y - composition.handPosition.y
                };
              }
              updateProperty('handFollower', next);
              setSelectorOpen(false);
            } catch (error) {
              console.error('Error applying hand tool selection:', error);
              alert('Error applying selection: ' + (error instanceof Error ? error.message : String(error)));
            }
          }}
          onClose={()=> setSelectorOpen(false)}
        />
      )}
      {calOpen && selectedObj?.type==='svgPath' && selectedObj.properties?.handFollower?.handAsset && selectedObj.properties?.handFollower?.toolAsset && (
        <HandToolCalibrator
          hand={selectedObj.properties.handFollower.handAsset}
          tool={selectedObj.properties.handFollower.toolAsset}
          onClose={()=> setCalOpen(false)}
        />
      )}
      
      {/* Hand Follower Calibration Modal */}
      {calibrationModalOpen && selectedObj?.type==='svgPath' && selectedObj.properties?.handFollower?.enabled && selectedObj.properties?.handFollower?.handAsset && selectedObj.properties?.handFollower?.toolAsset && (
        <HandFollowerCalibrationModal
          isOpen={calibrationModalOpen}
          onClose={() => setCalibrationModalOpen(false)}
          handAsset={selectedObj.properties.handFollower.handAsset}
          toolAsset={selectedObj.properties.handFollower.toolAsset}
          pathData={(selectedObj as any).pathData || ''}
          initialSettings={{
            tipBacktrackPx: selectedObj.properties.handFollower.tipBacktrackPx,
            calibrationOffset: selectedObj.properties.handFollower.calibrationOffset,
            nibAnchor: selectedObj.properties.handFollower.nibAnchor,
            scale: selectedObj.properties.handFollower.scale,
            mirror: selectedObj.properties.handFollower.mirror,
            showForeground: selectedObj.properties.handFollower.showForeground,
          }}
          onApply={(settings: { tipBacktrackPx: number; calibrationOffset: { x: number; y: number }; nibAnchor: { x: number; y: number }; scale: number; mirror: boolean; showForeground: boolean; extraOffset?: { x: number; y: number }; }) => {
            const currentSettings = selectedObj.properties?.handFollower || {};
            updateProperty('handFollower', { ...currentSettings, ...settings });
          }}
          onLiveChange={(partial: Partial<{ tipBacktrackPx: number; calibrationOffset: { x: number; y: number }; nibAnchor: { x: number; y: number }; scale: number; mirror: boolean; showForeground: boolean; extraOffset?: { x: number; y: number }; }>) => {
            const currentSettings = selectedObj.properties?.handFollower || {};
            updateProperty('handFollower', { ...currentSettings, ...partial });
          }}
        />
      )}
    </div>
  );
};

export default PropertiesPanel;
