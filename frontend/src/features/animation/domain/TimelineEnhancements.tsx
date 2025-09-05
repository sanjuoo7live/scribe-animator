import React from 'react';

interface TimelineEnhancementsProps {
  duration: number;
  setDuration: (duration: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  onAddMarker: (time: number, label?: string) => void;
  onClearMarkers: () => void;
  markers: Array<{ id: string; time: number; label: string; color: string }>;
  // New controls
  smoothPlayback?: boolean;
  setSmoothPlayback?: (v: boolean) => void;
  previewMode?: boolean;
  setPreviewMode?: (v: boolean) => void;
  autoSave?: boolean;
  setAutoSave?: (v: boolean) => void;
  onApplyAnimationPreset?: (preset: string) => void;
  showMarkerLabels?: boolean;
  setShowMarkerLabels?: (v: boolean) => void;
  compactUIOnPlay?: boolean;
  setCompactUIOnPlay?: (v: boolean) => void;
}

const TimelineEnhancements: React.FC<TimelineEnhancementsProps> = ({
  duration,
  setDuration,
  zoom,
  setZoom,
  snapToGrid,
  setSnapToGrid,
  onAddMarker,
  onClearMarkers,
  markers,
  smoothPlayback,
  setSmoothPlayback,
  previewMode,
  setPreviewMode,
  autoSave,
  setAutoSave,
  onApplyAnimationPreset,
  showMarkerLabels,
  setShowMarkerLabels,
  compactUIOnPlay,
  setCompactUIOnPlay,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [newMarkerLabel, setNewMarkerLabel] = React.useState('');
  const [markerTime, setMarkerTime] = React.useState(0);

  const presetDurations = [5, 10, 15, 30, 45, 60, 90, 120, 180, 300];
  const presetZooms = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5];

  const handleAddMarker = () => {
    if (newMarkerLabel.trim()) {
      onAddMarker(markerTime, newMarkerLabel.trim());
      setNewMarkerLabel('');
      setMarkerTime(0);
    }
  };

  const getMarkerColor = (index: number) => {
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 max-h-96 overflow-y-auto">
      {/* Scrollable container with fixed max height */}
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center sticky top-0 bg-gray-800 z-10 pb-2 border-b border-gray-700">
          <h3 className="text-sm font-bold text-white">🎬 Advanced Timeline Controls</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showAdvanced ? '🔼 Hide Advanced' : '🔽 Show Advanced'}
        </button>
      </div>

      {/* Basic Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Duration Presets */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">📏 Quick Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:border-blue-500 focus:outline-none"
          >
            {presetDurations.map(dur => (
              <option key={dur} value={dur}>{dur}s</option>
            ))}
          </select>
        </div>

        {/* Zoom Presets */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">🔍 Zoom Level</label>
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:border-blue-500 focus:outline-none"
          >
            {presetZooms.map(z => (
              <option key={z} value={z}>{(z * 100).toFixed(0)}%</option>
            ))}
          </select>
        </div>

        {/* Snap to Grid */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">📐 Snap to Grid</label>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`w-full px-2 py-1 rounded text-xs font-medium transition-all ${
              snapToGrid 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {snapToGrid ? '✅ Enabled' : '❌ Disabled'}
          </button>
        </div>

        {/* Markers Count */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">🏷️ Markers</label>
          <div className="flex gap-1">
            <span className="px-2 py-1 bg-gray-700 rounded text-xs text-white flex-1 text-center">
              {markers.length} markers
            </span>
            <button
              onClick={onClearMarkers}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
              title="Clear all markers"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="space-y-4 border-t border-gray-600 pt-4">
          {/* Timeline Markers */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">📍 Timeline Markers</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  value={newMarkerLabel}
                  onChange={(e) => setNewMarkerLabel(e.target.value)}
                  placeholder="Marker label..."
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={markerTime}
                  onChange={(e) => setMarkerTime(Number(e.target.value))}
                  min="0"
                  max={duration}
                  step="0.1"
                  placeholder="Time (seconds)"
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleAddMarker}
                disabled={!newMarkerLabel.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-xs font-medium text-white transition-colors"
              >
                ➕ Add Marker
              </button>
            </div>

            {/* Marker List */}
            {markers.length > 0 && (
              <div className="mt-3 space-y-1 max-h-20 overflow-y-auto">
                {markers.map((marker, index) => (
                  <div key={marker.id} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getMarkerColor(index) }}
                    />
                    <span className="text-white font-medium">{marker.label}</span>
                    <span className="text-gray-400">@{marker.time.toFixed(1)}s</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Animation Curves */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">📈 Animation Presets</label>
            <div className="mb-2 text-xs text-gray-400">
              💡 These apply easing to the selected object's animation (fadeIn, scaleIn, slideIn). Select an object on canvas first!
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { name: 'Linear', icon: '📏', desc: 'Constant speed' },
                { name: 'Ease In', icon: '🚀', desc: 'Slow start' },
                { name: 'Ease Out', icon: '🛑', desc: 'Slow end' },
                { name: 'Bounce', icon: '🏀', desc: 'Spring effect' },
              ].map(preset => (
                <button
                  key={preset.name}
                  onClick={() => onApplyAnimationPreset && onApplyAnimationPreset(preset.name)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-center transition-colors border border-gray-600 hover:border-gray-500"
                  title={preset.desc}
                >
                  <div className="text-lg">{preset.icon}</div>
                  <div className="text-white font-medium">{preset.name}</div>
                  <div className="text-gray-400 text-xs">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Performance Settings */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">⚡ Performance</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="smoothPlayback" className="rounded"
                  checked={!!smoothPlayback}
                  onChange={(e) => setSmoothPlayback && setSmoothPlayback(e.target.checked)}
                />
                <label htmlFor="smoothPlayback" className="text-xs text-gray-300">
                  🎬 Smooth playback
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="previewMode" className="rounded"
                  checked={!!previewMode}
                  onChange={(e) => setPreviewMode && setPreviewMode(e.target.checked)}
                />
                <label htmlFor="previewMode" className="text-xs text-gray-300">
                  👁️ Preview mode
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="autoSave" className="rounded"
                  checked={autoSave !== false}
                  onChange={(e) => setAutoSave && setAutoSave(e.target.checked)}
                />
                <label htmlFor="autoSave" className="text-xs text-gray-300">
                  💾 Auto-save
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="showMarkerLabels" className="rounded"
                  checked={!!showMarkerLabels}
                  onChange={(e) => setShowMarkerLabels && setShowMarkerLabels(e.target.checked)}
                />
                <label htmlFor="showMarkerLabels" className="text-xs text-gray-300">
                  🏷️ Show marker labels
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="compactUIOnPlay" className="rounded"
                  checked={!!compactUIOnPlay}
                  onChange={(e) => setCompactUIOnPlay && setCompactUIOnPlay(e.target.checked)}
                />
                <label htmlFor="compactUIOnPlay" className="text-xs text-gray-300">
                  🧹 Compact UI while playing
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default TimelineEnhancements;
