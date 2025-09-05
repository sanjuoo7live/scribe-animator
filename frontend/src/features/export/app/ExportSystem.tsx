import React, { useState } from 'react';
import { useAppStore } from '../../../store/appStore';

interface ExportSettings {
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fps: number;
  resolution: 'source' | '1080p' | '720p' | '480p';
  includeAudio: boolean;
  startTime: number;
  endTime: number;
}

interface ExportSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportSystem: React.FC<ExportSystemProps> = ({ isOpen, onClose }) => {
  const { currentProject } = useAppStore();
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: 'high',
    fps: 30,
    resolution: 'source',
    includeAudio: true,
    startTime: 0,
    endTime: currentProject?.duration || 60
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<string>('');

  if (!isOpen || !currentProject) return null;

  const qualitySettings = {
    low: { bitrate: '1M', description: 'Fast export, smaller file size' },
    medium: { bitrate: '2M', description: 'Balanced quality and size' },
    high: { bitrate: '4M', description: 'High quality, larger file size' },
    ultra: { bitrate: '8M', description: 'Best quality, largest file size' }
  };

  const resolutionSettings = {
    source: { width: currentProject.width, height: currentProject.height },
    '1080p': { width: 1920, height: 1080 },
    '720p': { width: 1280, height: 720 },
    '480p': { width: 854, height: 480 }
  };

  const handleExport = async () => {
    if (!currentProject) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Preparing export...');

    try {
      // Send export request to backend
      const exportData = {
        project: currentProject,
        settings: exportSettings,
        resolution: resolutionSettings[exportSettings.resolution]
      };

      const response = await fetch(`http://localhost:3001/api/render/${currentProject.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      if (response.ok) {
        // Simulate export progress (in real implementation, you'd poll for status)
        setExportStatus('Rendering video...');
        
        const progressInterval = setInterval(() => {
          setExportProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              setExportStatus('Export complete!');
              setIsExporting(false);
              return 100;
            }
            return prev + Math.random() * 10;
          });
        }, 500);

        // In real implementation, you'd download the file or provide a download link
        setTimeout(() => {
          clearInterval(progressInterval);
          setExportStatus('Export complete! Download will start automatically.');
          setExportProgress(100);
          setIsExporting(false);
          
          // Simulate download link
          const link = document.createElement('a');
          link.href = '#'; // In real implementation, this would be the video file URL
          link.download = `${currentProject.name}.${exportSettings.format}`;
          // link.click(); // Uncomment when actual file is ready
        }, 5000);

      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      setExportStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsExporting(false);
    }
  };

  const getEstimatedFileSize = () => {
    const duration = exportSettings.endTime - exportSettings.startTime;
    const quality = qualitySettings[exportSettings.quality];
    
    // Rough calculation: bitrate * duration / 8 (convert bits to bytes)
    const bitrateNum = parseFloat(quality.bitrate.replace('M', ''));
    const estimatedMB = (bitrateNum * duration) / 8;
    
    return estimatedMB < 1000 ? `${Math.round(estimatedMB)}MB` : `${(estimatedMB / 1000).toFixed(1)}GB`;
  };

  const getEstimatedTime = () => {
    const duration = exportSettings.endTime - exportSettings.startTime;
    const complexity = currentProject.objects.length;
    
    // Rough estimate based on duration and complexity
    const baseTime = duration * 0.5; // 0.5 seconds per second of video
    const complexityMultiplier = 1 + (complexity * 0.1);
    const qualityMultiplier = { low: 0.5, medium: 1, high: 1.5, ultra: 2.5 }[exportSettings.quality];
    
    const estimatedSeconds = baseTime * complexityMultiplier * qualityMultiplier;
    
    if (estimatedSeconds < 60) {
      return `${Math.round(estimatedSeconds)}s`;
    } else {
      return `${Math.round(estimatedSeconds / 60)}m ${Math.round(estimatedSeconds % 60)}s`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Export Video</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
            disabled={isExporting}
          >
            ×
          </button>
        </div>

        {!isExporting ? (
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Export Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['mp4', 'webm', 'gif'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportSettings(prev => ({ ...prev, format }))}
                    className={`p-3 rounded border-2 ${
                      exportSettings.format === format
                        ? 'border-blue-500 bg-blue-600'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-white font-medium">{format.toUpperCase()}</div>
                    <div className="text-xs text-gray-300">
                      {format === 'mp4' && 'Best compatibility'}
                      {format === 'webm' && 'Smaller file size'}
                      {format === 'gif' && 'Animation only'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Quality</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(qualitySettings) as Array<keyof typeof qualitySettings>).map((quality) => (
                  <button
                    key={quality}
                    onClick={() => setExportSettings(prev => ({ ...prev, quality }))}
                    className={`p-3 rounded border-2 text-left ${
                      exportSettings.quality === quality
                        ? 'border-blue-500 bg-blue-600'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-white font-medium capitalize">{quality}</div>
                    <div className="text-xs text-gray-300">{qualitySettings[quality].description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Resolution</label>
              <select
                value={exportSettings.resolution}
                onChange={(e) => setExportSettings(prev => ({ 
                  ...prev, 
                  resolution: e.target.value as ExportSettings['resolution']
                }))}
                className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="source">Source ({currentProject.width}×{currentProject.height})</option>
                <option value="1080p">Full HD (1920×1080)</option>
                <option value="720p">HD (1280×720)</option>
                <option value="480p">SD (854×480)</option>
              </select>
            </div>

            {/* Frame Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Frame Rate (FPS)</label>
              <select
                value={exportSettings.fps}
                onChange={(e) => setExportSettings(prev => ({ ...prev, fps: Number(e.target.value) }))}
                className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value={24}>24 FPS (Cinematic)</option>
                <option value={30}>30 FPS (Standard)</option>
                <option value={60}>60 FPS (Smooth)</option>
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Export Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Time (seconds)</label>
                  <input
                    type="number"
                    min="0"
                    max={currentProject.duration}
                    value={exportSettings.startTime}
                    onChange={(e) => setExportSettings(prev => ({ 
                      ...prev, 
                      startTime: Math.max(0, Number(e.target.value))
                    }))}
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End Time (seconds)</label>
                  <input
                    type="number"
                    min={exportSettings.startTime}
                    max={currentProject.duration}
                    value={exportSettings.endTime}
                    onChange={(e) => setExportSettings(prev => ({ 
                      ...prev, 
                      endTime: Math.min(currentProject.duration, Number(e.target.value))
                    }))}
                    className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Audio Options */}
            {exportSettings.format !== 'gif' && (
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportSettings.includeAudio}
                    onChange={(e) => setExportSettings(prev => ({ ...prev, includeAudio: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">Include audio (background music & voiceover)</span>
                </label>
              </div>
            )}

            {/* Export Summary */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Export Summary</h4>
              <div className="space-y-1 text-sm text-gray-300">
                <div>Duration: {exportSettings.endTime - exportSettings.startTime}s</div>
                <div>Resolution: {resolutionSettings[exportSettings.resolution].width}×{resolutionSettings[exportSettings.resolution].height}</div>
                <div>Estimated file size: {getEstimatedFileSize()}</div>
                <div>Estimated export time: {getEstimatedTime()}</div>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              Start Export
            </button>
          </div>
        ) : (
          /* Export Progress */
          <div className="text-center">
            <div className="mb-6">
              <div className="text-2xl mb-2">🎬</div>
              <h4 className="text-lg font-medium text-white mb-2">Exporting Video</h4>
              <p className="text-gray-300">{exportStatus}</p>
            </div>

            <div className="mb-6">
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-400">
                {Math.round(exportProgress)}% complete
              </div>
            </div>

            {exportProgress < 100 && (
              <div className="text-xs text-gray-500">
                Please keep this window open while exporting...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportSystem;
