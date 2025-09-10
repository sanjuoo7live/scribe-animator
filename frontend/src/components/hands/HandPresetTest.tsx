/**
 * Hand Preset Test Component
 * Phase 1: Simple test to verify preset loading functionality
 */

import React, { useState, useEffect } from 'react';
import { HandPresetManager } from '../../utils/handPresetManager';
import { HandPreset, HandPresetManifestEntry } from '../../types/handPresets';

export const HandPresetTest: React.FC = () => {
  const [presets, setPresets] = useState<HandPresetManifestEntry[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<HandPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      const availablePresets = await HandPresetManager.getAvailablePresets();
      setPresets(availablePresets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load presets');
    } finally {
      setLoading(false);
    }
  };

  const loadPresetDetails = async (id: string) => {
    try {
      setError(null);
      const preset = await HandPresetManager.loadPreset(id);
      setSelectedPreset(preset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preset details');
    }
  };

  const testLegacyConversion = () => {
    if (!selectedPreset) return;
    
    const legacyHand = HandPresetManager.presetToLegacyHandAsset(selectedPreset);
    const legacyTool = HandPresetManager.presetToLegacyToolAsset(selectedPreset);
    
    console.log('Legacy Hand Asset:', legacyHand);
    console.log('Legacy Tool Asset:', legacyTool);
    alert('Legacy conversion complete! Check console for details.');
  };

  if (loading) {
    return <div className="p-4 text-white">Loading hand presets...</div>;
  }

  return (
    <div className="p-4 text-white space-y-4">
      <h2 className="text-xl font-bold">Hand Preset Manager Test</h2>
      
      {error && (
        <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded p-3">
          <p className="text-red-300">Error: {error}</p>
          <button 
            onClick={loadPresets}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Retry
          </button>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Available Presets:</h3>
        <div className="space-y-2">
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => loadPresetDetails(preset.id)}
              className="block w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded border"
            >
              <div className="font-medium">{preset.id}</div>
              <div className="text-sm text-gray-300">{preset.path}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedPreset && (
        <div className="border border-gray-600 rounded p-4 space-y-3">
          <h3 className="text-lg font-semibold">Preset Details:</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>ID:</strong> {selectedPreset.id}
            </div>
            <div>
              <strong>Title:</strong> {selectedPreset.title}
            </div>
            <div>
              <strong>Handedness:</strong> {selectedPreset.handedness}
            </div>
            <div>
              <strong>Tool Type:</strong> {selectedPreset.tool.type}
            </div>
            <div>
              <strong>Dimensions:</strong> {selectedPreset.dimensions.width}x{selectedPreset.dimensions.height}
            </div>
            <div>
              <strong>Style:</strong> {selectedPreset.style}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Tool Configuration:</h4>
            <div className="text-sm space-y-1">
              <div>Tip Position: ({selectedPreset.tool.tip.x}, {selectedPreset.tool.tip.y})</div>
              <div>Length: {selectedPreset.tool.lengthPx}px</div>
              {selectedPreset.tool.pressureToWidth && (
                <div>Pressure Width: {selectedPreset.tool.pressureToWidth.min}-{selectedPreset.tool.pressureToWidth.max}</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Images:</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedPreset.images).map(([key, filename]) => (
                <div key={key} className="text-sm">
                  <div className="font-medium">{key}:</div>
                  <div className="text-gray-300">{String(filename)}</div>
                  <img 
                    src={HandPresetManager.getAssetPath(selectedPreset, key as keyof typeof selectedPreset.images)}
                    alt={`${key} preview`}
                    className="w-16 h-16 object-cover border border-gray-600 rounded mt-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={testLegacyConversion}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Test Legacy Conversion
          </button>
        </div>
      )}
    </div>
  );
};
