/**
 * Tool Preset Test Component
 * Test interface for the independent tools library
 */

import React, { useState, useEffect } from 'react';
import { ToolPresetManager } from '../../utils/toolPresetManager';
import { ToolPreset, ToolPresetManifestEntry } from '../../types/handPresets';

export const ToolPresetTest: React.FC = () => {
  const [tools, setTools] = useState<ToolPresetManifestEntry[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolPreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [libraryAvailable, setLibraryAvailable] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const availableTools = await ToolPresetManager.getAvailablePresets();
      setTools(availableTools);
      setLibraryAvailable(availableTools.length > 0);
      
      if (availableTools.length === 0) {
        setError('No tools library found at /assets/tools/index.json');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools');
      setLibraryAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const loadToolDetails = async (id: string) => {
    try {
      setError(null);
      const tool = await ToolPresetManager.loadPreset(id);
      setSelectedTool(tool);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tool details');
    }
  };

  const testLegacyConversion = () => {
    if (!selectedTool) return;
    
    const legacyTool = ToolPresetManager.presetToLegacyToolAsset(selectedTool);
    
    console.log('Legacy Tool Asset:', legacyTool);
    alert('Legacy conversion complete! Check console for details.');
  };

  if (loading) {
    return <div className="p-4 text-white">Loading tools library...</div>;
  }

  return (
    <div className="p-4 text-white space-y-4">
      <h2 className="text-xl font-bold">Independent Tools Library Test</h2>
      
      <div className={`p-3 rounded border ${
        libraryAvailable 
          ? 'bg-green-600 bg-opacity-20 border-green-600' 
          : 'bg-yellow-600 bg-opacity-20 border-yellow-600'
      }`}>
        <p className={libraryAvailable ? 'text-green-300' : 'text-yellow-300'}>
          {libraryAvailable 
            ? `✅ Tools library loaded successfully (${tools.length} tools)`
            : '⚠️ No tools library found - UI will show hand preset tools instead'
          }
        </p>
      </div>
      
      {error && (
        <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded p-3">
          <p className="text-red-300">Error: {error}</p>
          <button 
            onClick={loadTools}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {libraryAvailable && (
        <>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Available Tools:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => loadToolDetails(tool.id)}
                  className="block text-left p-3 bg-gray-700 hover:bg-gray-600 rounded border transition-colors"
                >
                  <div className="font-medium">{tool.id}</div>
                  <div className="text-sm text-gray-300">{tool.path}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedTool && (
            <div className="border border-gray-600 rounded p-4 space-y-3">
              <h3 className="text-lg font-semibold">Tool Details:</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>ID:</strong> {selectedTool.id}
                </div>
                <div>
                  <strong>Title:</strong> {selectedTool.title}
                </div>
                <div>
                  <strong>Type:</strong> {selectedTool.type}
                </div>
                <div>
                  <strong>Dimensions:</strong> {selectedTool.dimensions.width}x{selectedTool.dimensions.height}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Anchor Points:</h4>
                <div className="text-sm space-y-1">
                  <div>Socket Base: ({selectedTool.anchors.socketBase.x}, {selectedTool.anchors.socketBase.y})</div>
                  <div>Socket Forward: ({selectedTool.anchors.socketForward.x}, {selectedTool.anchors.socketForward.y})</div>
                  <div>Tip: ({selectedTool.anchors.tip.x}, {selectedTool.anchors.tip.y})</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Images:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedTool.images).map(([key, filename]) => (
                    <div key={key} className="text-sm">
                      <div className="font-medium">{key}:</div>
                      <div className="text-gray-300">{String(filename)}</div>
                      <img 
                        src={ToolPresetManager.getAssetPath(selectedTool, key as keyof typeof selectedTool.images)}
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

              <div className="flex gap-2">
                <button
                  onClick={testLegacyConversion}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Test Legacy Conversion
                </button>
                
                {selectedTool.render?.rotationOffsetDeg !== undefined && (
                  <div className="px-4 py-2 bg-gray-700 rounded text-sm">
                    Rotation Offset: {selectedTool.render.rotationOffsetDeg}°
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded">
        <strong>About:</strong> This test verifies the independent tools library at 
        <code className="mx-1 bg-gray-700 px-1 rounded">/assets/tools/</code>. 
        If the library is missing, the hand animation system will gracefully fall back to using 
        tools bundled with hand presets.
      </div>
    </div>
  );
};
