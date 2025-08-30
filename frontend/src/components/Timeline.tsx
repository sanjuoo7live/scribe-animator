import React from 'react';
import { useAppStore } from '../store/appStore';
import TimelineEnhancements from './TimelineEnhancements';
import KeyframeInterpolation from './KeyframeInterpolation';
import AnimationCurveEditor from './AnimationCurveEditor';

interface Keyframe {
  id: string;
  time: number;
  objectId: string;
  properties: {
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    opacity?: number;
  };
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
}

interface ContextMenu {
  x: number;
  y: number;
  objectId: string;
  time: number;
}

interface DragState {
  isDragging: boolean;
  objectId: string;
  mode: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  startTime: number;
  originalStart: number;
  originalDuration: number;
}

const Timeline: React.FC = () => {
  const [duration, setDuration] = React.useState(30); // Adjustable project duration
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [keyframes, setKeyframes] = React.useState<Keyframe[]>([]);
  const [contextMenu, setContextMenu] = React.useState<ContextMenu | null>(null);
  const [selectedKeyframe, setSelectedKeyframe] = React.useState<string | null>(null);
  const [showKeyframeEditor, setShowKeyframeEditor] = React.useState(false);
  const [dragState, setDragState] = React.useState<DragState | null>(null);
  const [zoom, setZoom] = React.useState(1); // Timeline zoom level
  const [smoothPlayback, setSmoothPlayback] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState(false);
  const [autoSave, setAutoSave] = React.useState(true);
  const [showMarkerLabels, setShowMarkerLabels] = React.useState(false);
  const animationFrameRef = React.useRef<number | null>(null);
  // Slider scrubbing state
  const [preScrubPlaying, setPreScrubPlaying] = React.useState(false);
  
  // Advanced timeline features state
  const [showEnhancements, setShowEnhancements] = React.useState(false);
  const [showKeyframeInterpolation, setShowKeyframeInterpolation] = React.useState(false);
  const [showCurveEditor, setShowCurveEditor] = React.useState(false);
  const [currentCurve, setCurrentCurve] = React.useState('ease-in-out');
  
  const { currentTime, setCurrentTime, currentProject, updateObject, addObject, setPlaying, setCompactUIOnPlay, compactUIOnPlay, selectedObject, moveObjectLayer, removeObject, selectObject } = useAppStore();

  // Cleanup animation frame on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Preview mode effects
  React.useEffect(() => {
    if (previewMode) {
      document.body.classList.add('preview-mode');
    } else {
      document.body.classList.remove('preview-mode');
    }
    return () => document.body.classList.remove('preview-mode');
  }, [previewMode]);

  // Handle playback state changes
  React.useEffect(() => {
    if (!isPlaying && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [isPlaying]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    setCurrentTime(newTime);
  };

  const handleTimelineRightClick = (e: React.MouseEvent<HTMLDivElement>, objectId: string) => {
    console.log('handleTimelineRightClick called with objectId:', objectId);
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    
    console.log('Setting context menu at time:', time);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      objectId,
      time
    });
  };

  // handleMouseDown legacy handler removed; we now wire direct handlers on elements

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!dragState || !dragState.isDragging) return;
    
    const deltaX = e.clientX - dragState.startX;
    const timelineElement = document.querySelector('.timeline-container');
    if (!timelineElement) return;
    
    const rect = timelineElement.getBoundingClientRect();
    const deltaTime = (deltaX / rect.width) * duration * zoom;
    
    const object = currentProject?.objects.find(obj => obj.id === dragState.objectId);
    if (!object || !updateObject) return;
    
    let newStart = dragState.originalStart;
    let newDuration = dragState.originalDuration;
    
    switch (dragState.mode) {
      case 'move':
        newStart = Math.max(0, Math.min(duration - newDuration, dragState.originalStart + deltaTime));
        break;
      case 'resize-start':
        const minStart = 0;
        const maxStart = dragState.originalStart + dragState.originalDuration - 0.1;
        newStart = Math.max(minStart, Math.min(maxStart, dragState.originalStart + deltaTime));
        newDuration = dragState.originalDuration - (newStart - dragState.originalStart);
        break;
      case 'resize-end':
        const maxEnd = duration - dragState.originalStart;
        newDuration = Math.max(0.1, Math.min(maxEnd, dragState.originalDuration + deltaTime));
        break;
    }
    
    // Update object with new timing
    updateObject(dragState.objectId, {
      animationStart: newStart,
      animationDuration: newDuration
    });
  }, [dragState, duration, zoom, currentProject, updateObject]);

  const handleMouseUp = React.useCallback(() => {
    setDragState(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // Cleanup event listeners
  React.useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Timeline zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.5));
  
  // Duration adjustment
  const handleDurationChange = (newDuration: number) => {
    const safeDuration = Math.max(5, Math.min(300, newDuration)); // 5 seconds to 5 minutes
    setDuration(safeDuration);
    if (currentTime > safeDuration) {
      setCurrentTime(safeDuration);
    }
  };

  const addKeyframe = (objectId: string, time: number) => {
    console.log('Adding keyframe for object:', objectId, 'at time:', time);
    const object = currentProject?.objects.find(obj => obj.id === objectId);
    if (!object) {
      console.log('Object not found');
      return;
    }

    const newKeyframe: Keyframe = {
      id: `keyframe-${Date.now()}`,
      time,
      objectId,
      properties: {
        x: object.x,
        y: object.y,
        scaleX: 1, // Default scale
        scaleY: 1, // Default scale
        rotation: object.rotation || 0,
        opacity: 1 // Default opacity
      },
      easing: 'ease-in-out'
    };

    console.log('New keyframe created:', newKeyframe);
    setKeyframes(prev => [...prev, newKeyframe]);
    setContextMenu(null);
  };

  const deleteKeyframe = (keyframeId: string) => {
    setKeyframes(prev => prev.filter(kf => kf.id !== keyframeId));
    setSelectedKeyframe(null);
  };

  const updateKeyframeProperty = (keyframeId: string, property: string, value: number) => {
    setKeyframes(prev => prev.map(kf => 
      kf.id === keyframeId 
        ? { ...kf, properties: { ...kf.properties, [property]: value } }
        : kf
    ));
  };

  const updateKeyframeEasing = (keyframeId: string, easing: Keyframe['easing']) => {
    setKeyframes(prev => prev.map(kf => 
      kf.id === keyframeId ? { ...kf, easing } : kf
    ));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = () => {
    const newPlayingState = !isPlaying;
  setIsPlaying(newPlayingState);
  setPlaying(newPlayingState);
    
    if (newPlayingState) {
      // Start playback animation
      const startTime = Date.now();
      const initialTime = currentTime;
      
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const newTime = initialTime + elapsed;
        
        if (newTime >= duration) {
          setCurrentTime(duration);
          setIsPlaying(false);
          return;
        }
        // Smooth playback simply clamps update granularity
        if (smoothPlayback) {
          const step = 1 / 30; // 30 FPS for smoother but noticeable steps
          const snapped = Math.round(newTime / step) * step;
          setCurrentTime(snapped);
        } else {
          // Regular playback - update every frame
          setCurrentTime(newTime);
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  // Slider handlers for scrubbing
  const handleSliderChange = (val: number) => {
    const clamped = Math.max(0, Math.min(duration, val));
    setCurrentTime(clamped);
  };
  const beginScrub = () => {
    setPreScrubPlaying(isPlaying);
    if (isPlaying) {
      setIsPlaying(false);
      setPlaying(false);
    }
  };
  const endScrub = () => {
    if (preScrubPlaying) {
      setIsPlaying(true);
      setPlaying(true);
    }
  };

  // Stop animation when component unmounts or isPlaying changes to false
  React.useEffect(() => {
    if (!isPlaying && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [isPlaying]);

  // Cleanup animation frame on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Advanced timeline handlers
  const handleUpdateKeyframe = (id: string, updates: any) => {
    setKeyframes(prev => prev.map(kf => 
      kf.id === id ? { ...kf, ...updates } : kf
    ));
  };

  const handleDeleteKeyframe = (id: string) => {
    setKeyframes(prev => prev.filter(kf => kf.id !== id));
  };

  const handleApplyCurve = (curveName: string, customPoints?: number[]) => {
    setCurrentCurve(curveName);
    // Apply curve to selected keyframe or objects
    if (selectedKeyframe) {
      handleUpdateKeyframe(selectedKeyframe, { easing: curveName });
    }
  };

  // Timeline markers state
  const [markers, setMarkers] = React.useState<Array<{ id: string; time: number; label: string; color: string }>>([]);
  const [snapToGrid, setSnapToGrid] = React.useState(false);

  // Add marker is now handled inline where needed

  const handleClearMarkers = () => {
    setMarkers([]);
  };

  // Auto-save: persist keyframes and project timing to localStorage
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  React.useEffect(() => {
    if (!autoSave) return;
    
    setAutoSaveStatus('saving');
    const payload = {
      keyframes,
      duration,
      currentTime,
      objects: currentProject?.objects || []
    };
    try {
      localStorage.setItem('scribeAnimator:autoSave', JSON.stringify(payload));
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 1000);
    } catch {
      setAutoSaveStatus('idle');
    }
  }, [autoSave, keyframes, duration, currentTime, currentProject?.objects]);

  // Load autosave once
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('scribeAnimator:autoSave');
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.keyframes)) setKeyframes(data.keyframes);
        if (typeof data.duration === 'number') setDuration(data.duration);
        if (typeof data.currentTime === 'number') setCurrentTime(data.currentTime);
      }
    } catch {}
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportProject = async () => {
    if (!currentProject) {
      alert('No project loaded to export');
      return;
    }
    
    try {
      setIsPlaying(false); // Stop playback during export
      
      const response = await fetch('http://localhost:3001/api/projects/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          project: currentProject,
          settings: {
            width: 1920,
            height: 1080,
            fps: 30,
            duration: duration
          }
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Export started successfully! Job ID: ${result.jobId}\nStatus: ${result.status}`);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="h-full p-4 bg-gray-900 border-t border-gray-700 overflow-y-auto">
      <div className="mb-4 flex justify-between items-center sticky top-0 bg-gray-900 z-20 pb-2">
        <h3 className="text-lg font-bold text-white">Timeline</h3>
                  <div className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded-lg flex items-center gap-2">
            {formatTime(currentTime)} / {formatTime(duration)}
            {autoSave && (
              <span className={`text-xs ${
                autoSaveStatus === 'saving' ? 'text-yellow-400' : 
                autoSaveStatus === 'saved' ? 'text-green-400' : 'text-gray-500'
              }`}>
                {autoSaveStatus === 'saving' ? '💾 Saving...' : 
                 autoSaveStatus === 'saved' ? '✅ Saved' : '💾'}
              </span>
            )}
          </div>
      </div>

      {/* Draggable timeline slider */}
      <div className="mb-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={Math.min(duration, Math.max(0, currentTime))}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          onMouseDown={beginScrub}
          onMouseUp={endScrub}
          onTouchStart={beginScrub}
          onTouchEnd={endScrub}
          className="w-full"
          aria-label="Timeline position"
        />
      </div>

      {/* Main Timeline Scrubber */}
      <div className="relative mb-6">
        <div
          className="h-12 bg-gray-700 rounded-lg cursor-pointer relative border border-gray-600 shadow-inner"
          onClick={handleTimelineClick}
        >
          {/* Progress indicator */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg opacity-75"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          
          {/* Playhead */}
          <div
            className="absolute top-0 w-1 h-full bg-red-500 shadow-lg z-10"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          >
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
          </div>

          {/* Time grid */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} className="flex-1 border-r border-gray-600 last:border-r-0 h-full relative">
                <div className="absolute bottom-1 left-1 text-xs text-gray-400">
                  {formatTime((duration / 10) * i)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="mb-6 space-y-3">
        {/* Playback Controls */}
        <div className="flex gap-3 items-center flex-wrap">
          <button 
            className={`px-4 py-2 rounded-lg hover:opacity-90 text-sm font-medium transition-all shadow-lg ${
              isPlaying ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
            }`}
            onClick={togglePlayback}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <button 
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm font-medium transition-all shadow-lg"
            onClick={() => {
              setCurrentTime(0);
              setIsPlaying(false);
            }}
          >
            ⏹️ Stop
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium transition-all shadow-lg"
            onClick={exportProject}
          >
            📹 Export Video
          </button>
          
          {/* Project info */}
          <div className="ml-auto text-sm text-gray-300 bg-gray-800 px-3 py-2 rounded-lg">
            {currentProject ? (
              <span>📦 {(currentProject.objects || []).length} objects</span>
            ) : (
              <span>⚠️ No project loaded</span>
            )}
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="flex gap-3 items-center flex-wrap bg-gray-800 p-3 rounded-lg border border-gray-700">
          {/* Duration Control */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 font-medium">Duration:</label>
            <input
              type="number"
              min="5"
              max="300"
              value={duration}
              onChange={(e) => handleDurationChange(Number(e.target.value))}
              className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <span className="text-xs text-gray-400">sec</span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 border-l border-gray-600 pl-3">
            <label className="text-xs text-gray-400 font-medium">Zoom:</label>
            <button 
              className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs transition-colors"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              🔍-
            </button>
            <span className="text-xs text-gray-300 w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button 
              className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs transition-colors"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              🔍+
            </button>
          </div>

          {/* Timeline Help */}
          <div className="ml-auto text-xs text-gray-500">
            💡 Click purple bars to jump to object time • Drag to move/resize • Right-click for keyframes
          </div>
        </div>
      </div>

      {/* Object tracks */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold text-white">Object Timeline</div>
          <div className="text-xs text-gray-400">
            {(currentProject?.objects || []).length} objects • Click purple bars to jump to object time
          </div>
        </div>
        {/* Global markers ruler */}
        {markers.length > 0 && (
          <div className="relative h-6 mb-2 bg-gray-900 rounded border border-gray-700">
            {markers.map((m) => (
              <div
                key={m.id}
                className="absolute top-0 group"
                style={{ left: `${(m.time / duration) * 100}%` }}
              >
                {/* Tick */}
                <div className="w-0.5 h-6 bg-yellow-400" />
                {/* Hover label */}
                {showMarkerLabels ? (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-gray-800/95 border border-yellow-400 text-yellow-200 text-[10px] whitespace-nowrap shadow-md">
                    {m.label}
                  </div>
                ) : (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-gray-800/95 border border-yellow-400 text-yellow-200 text-[10px] whitespace-nowrap shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {/* Debug info and help text */}
          {(!currentProject?.objects || currentProject.objects.length === 0) && (
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-yellow-400 mb-2">⚠️ No Objects in Timeline</div>
              <div className="text-sm text-gray-300 mb-3">
                Purple bars will appear here once you add objects to your canvas
              </div>
              <div className="text-xs text-gray-400 space-y-1 mb-4">
                <div>📋 <strong>Step 1:</strong> Add shapes or text from the left Asset Panel</div>
                <div>🟣 <strong>Step 2:</strong> Purple timeline bars will appear below</div>
                <div>🖱️ <strong>Step 3:</strong> Click purple bars to jump to objects, right-click for keyframes</div>
              </div>
              
              {/* Quick action button */}
              <button
                onClick={() => {
                  // Add a test rectangle to demonstrate
                  addObject({
                    id: `test-rect-${Date.now()}`,
                    type: 'shape' as const,
                    x: 100,
                    y: 100,
                    width: 100,
                    height: 100,
                    properties: {
                      shapeType: 'rectangle',
                      fill: 'transparent',
                      stroke: '#3b82f6',
                      strokeWidth: 2
                    },
                    animationStart: 0,
                    animationDuration: 5,
                    animationType: 'fadeIn' as const,
                    animationEasing: 'easeOut' as const
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
              >
                🎯 Add Test Rectangle (Demo)
              </button>
            </div>
          )}
          
          {currentProject?.objects && (currentProject.objects.length > 0) && (
            <div className="text-xs text-gray-400 mb-2 px-2">
              📊 {(currentProject.objects || []).length} object(s) • Click purple bars to jump to object time
            </div>
          )}
          
          {(currentProject?.objects || []).map((obj, index) => {
            const objectCount = (currentProject?.objects || []).length;
            
            // Calculate purple bar dimensions
            const barLeft = Math.max(0, ((obj.animationStart || 0) / duration) * 100);
            const barWidth = Math.max(2, ((obj.animationDuration || 5) / duration) * 100); // Minimum width in %
            
            const isVisible = currentTime >= (obj.animationStart || 0) && 
                            currentTime <= ((obj.animationStart || 0) + (obj.animationDuration || 5));
            
            return (
              <div key={obj.id} className="h-8 bg-gray-700 rounded px-2 flex items-center text-xs relative group border border-gray-600 hover:border-gray-500 transition-colors min-w-full"
                onClick={() => selectObject(obj.id)}
              >
                {/* Visibility indicator */}
                <div 
                  className={`w-2 h-2 mr-2 rounded-full flex-shrink-0 ${isVisible ? 'bg-green-500 shadow-sm' : 'bg-gray-500'}`}
                  title={isVisible ? 'Visible at current time' : 'Hidden at current time'}
                />
                
                {/* Layer order indicator */}
                <div 
                  className="text-xs text-gray-400 mr-2 font-mono w-4 flex-shrink-0 text-center"
                  title={`Layer ${index + 1} of ${objectCount}`}
                >
                  {index + 1}
                </div>
                
                <span className="text-xs font-medium truncate w-20 flex-shrink-0 text-white"
                  title={obj.type === 'shape' ? `${obj.properties.shapeType} ${index + 1}` : 
                         obj.type === 'text' ? `Text: "${obj.properties.text || 'Text'}"` : 
                         `${obj.type} ${index + 1}`}>
                  {obj.type === 'shape' ? `${obj.properties.shapeType} ${index + 1}` : 
                   obj.type === 'text' ? `${(obj.properties.text || 'Text').substring(0, 6)}...` : 
                   `${obj.type} ${index + 1}`}
                </span>
                
                <div className="flex-1 ml-2 relative h-4 bg-gray-800 rounded border border-gray-500" data-track="1">
                  {/* Flow layout to avoid absolute-position overlap issues */}
                  <div className="h-full w-full flex items-stretch">
                    {/* Spacer before the bar */}
                    <div style={{ width: `${((obj.animationStart || 0) / duration) * 100}%` }} />
                    
                    {/* Purple bar */}
          <div
                      style={{
            width: `${((obj.animationDuration || 5) / duration) * 100}%`,
            height: '100%',
                        backgroundColor: '#9333ea',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                        borderRadius: '4px',
                        position: 'relative',
                        cursor: 'pointer',
                        border: '2px solid rgba(255,255,255,0.9)'
                      }}
                      onClick={(e) => {
                        // This will be handled by the mouseup if it's not a drag
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => {
                        // Move the bar - with click detection
                        e.preventDefault();
                        e.stopPropagation();
                        const track = (e.currentTarget.closest('[data-track="1"]') as HTMLDivElement)!;
                        const rect = track.getBoundingClientRect();
                        const startX = e.clientX;
                        const startTime = obj.animationStart || 0;
                        const startDuration = obj.animationDuration || 5;
                        let hasDragged = false;

                        const onMove = (me: MouseEvent) => {
                          const deltaX = Math.abs(me.clientX - startX);
                          if (deltaX > 3) { // 3px threshold for drag detection
                            hasDragged = true;
                          }
                          
                          if (hasDragged) {
                            const deltaTime = ((me.clientX - startX) / rect.width) * duration;
                            let finalDeltaTime = deltaTime;
                            if (snapToGrid) {
                              const grid = 0.1; // 100ms grid
                              finalDeltaTime = Math.round(deltaTime / grid) * grid;
                            }
                            const newStartTime = Math.max(0, Math.min(duration - startDuration, startTime + finalDeltaTime));
                            updateObject(obj.id, { animationStart: newStartTime });
                          }
                        };
                        
            const onUp = () => {
                          if (!hasDragged) {
                            // Click without drag selects the object but preserves playhead position
                            selectObject(obj.id);
                          }
                          document.removeEventListener('mousemove', onMove);
                          document.removeEventListener('mouseup', onUp);
                        };
                        
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleTimelineRightClick(e as any, obj.id);
                      }}
                    >
                      {/* Left handle */}
                      <div
                        style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px',
                          backgroundColor: '#7c3aed', cursor: 'ew-resize', borderRadius: '4px 0 0 4px'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const track = (e.currentTarget.closest('[data-track="1"]') as HTMLDivElement)!;
                          const rect = track.getBoundingClientRect();
                          const startX = e.clientX;
                          const startTime = obj.animationStart || 0;
                          const startDuration = obj.animationDuration || 5;
                          const onMove = (me: MouseEvent) => {
                            const deltaX = me.clientX - startX;
                            let deltaTime = (deltaX / rect.width) * duration;
                            if (snapToGrid) {
                              const grid = 0.1;
                              deltaTime = Math.round(deltaTime / grid) * grid;
                            }
                            const newStartTime = Math.max(0, Math.min(startTime + startDuration - 0.1, startTime + deltaTime));
                            const newDuration = Math.max(0.1, startDuration - (newStartTime - startTime));
                            updateObject(obj.id, { animationStart: newStartTime, animationDuration: newDuration });
                          };
                          const onUp = () => {
                            document.removeEventListener('mousemove', onMove);
                            document.removeEventListener('mouseup', onUp);
                          };
                          document.addEventListener('mousemove', onMove);
                          document.addEventListener('mouseup', onUp);
                        }}
                      />

                      {/* Right handle */}
                      <div
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px',
                          backgroundColor: '#7c3aed', cursor: 'ew-resize', borderRadius: '0 4px 4px 0'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const track = (e.currentTarget.closest('[data-track="1"]') as HTMLDivElement)!;
                          const rect = track.getBoundingClientRect();
                          const startX = e.clientX;
                          const startTime = obj.animationStart || 0;
                          const startDuration = obj.animationDuration || 5;
                          const onMove = (me: MouseEvent) => {
                            const deltaX = me.clientX - startX;
                            let deltaTime = (deltaX / rect.width) * duration;
                            if (snapToGrid) {
                              const grid = 0.1;
                              deltaTime = Math.round(deltaTime / grid) * grid;
                            }
                            const newDuration = Math.max(0.1, Math.min(duration - startTime, startDuration + deltaTime));
                            updateObject(obj.id, { animationDuration: newDuration });
                          };
                          const onUp = () => {
                            document.removeEventListener('mousemove', onMove);
                            document.removeEventListener('mouseup', onUp);
                          };
                          document.addEventListener('mousemove', onMove);
                          document.addEventListener('mouseup', onUp);
                        }}
                      />

                      {/* Duration label (inside the bar) */}
                      {(obj.animationDuration || 5) > 0.8 && (
                        <div style={{
                          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                          color: 'white', fontSize: '10px', fontWeight: 700, pointerEvents: 'none',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                        }}>
                          {(obj.animationDuration || 5).toFixed(1)}s
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Keyframes */}
                  {keyframes
                    .filter(kf => kf.objectId === obj.id)
                    .map(keyframe => (
                      <div
                        key={keyframe.id}
                        className={`absolute top-0 w-4 h-full bg-yellow-400 cursor-pointer border-2 border-yellow-300 hover:bg-yellow-300 rounded-md transition-all ${
                          selectedKeyframe === keyframe.id ? 'ring-2 ring-white shadow-xl scale-110' : ''
                        }`}
                        style={{ left: `${(keyframe.time / duration) * 100}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKeyframe(keyframe.id);
                          setShowKeyframeEditor(true);
                        }}
                        title={`Keyframe at ${formatTime(keyframe.time)} (${keyframe.easing})`}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-yellow-800 rounded-full"></div>
                        </div>
                      </div>
                    ))
                  }
                  
                  {/* Current time indicator */}
                  <div
                    className="absolute top-0 w-1 h-full bg-red-400 pointer-events-none z-20 shadow-lg"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                </div>

                {/* Layer controls */}
                <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button 
                    className="w-6 h-6 text-xs bg-gray-600 hover:bg-gray-500 rounded border border-gray-500 hover:border-gray-400 transition-colors flex items-center justify-center"
                    title="Move layer up (bring forward)"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`Moving object ${obj.id} forward (up)`);
                      moveObjectLayer(obj.id, 'forward');
                    }}
                  >
                    ↑
                  </button>
                  <button 
                    className="w-6 h-6 text-xs bg-gray-600 hover:bg-gray-500 rounded border border-gray-500 hover:border-gray-400 transition-colors flex items-center justify-center"
                    title="Move layer down (send backward)"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`Moving object ${obj.id} backward (down)`);
                      moveObjectLayer(obj.id, 'backward');
                    }}
                  >
                    ↓
                  </button>
                  <button 
                    className="w-6 h-6 text-xs bg-red-600 hover:bg-red-500 rounded border border-red-500 hover:border-red-400 transition-colors flex items-center justify-center text-white"
                    title="Delete object"
                    onClick={(e) => {
                      e.stopPropagation();
                      const objectName = obj.type === 'shape' ? `${obj.properties.shapeType} ${index + 1}` : 
                                       obj.type === 'text' ? `Text: "${(obj.properties.text || 'Text').substring(0, 20)}..."` : 
                                       `${obj.type} ${index + 1}`;
                      if (window.confirm(`Delete "${objectName}"?`)) {
                        console.log(`Deleting object ${obj.id} (${objectName})`);
                        removeObject(obj.id);
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
          
          {/* Add default message if no objects */}
          {(!currentProject?.objects || currentProject.objects.length === 0) && (
            <div className="h-16 bg-gray-700 rounded-lg px-4 flex items-center justify-center text-sm border-2 border-dashed border-gray-600">
              <div className="text-center">
                <div className="text-2xl mb-2">📦</div>
                <span className="text-gray-400">No objects yet - add shapes or text from the left panel!</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl z-50 py-2 min-w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-600 mb-1">
            {formatTime(contextMenu.time)}
          </div>
          <button
            className="block w-full text-left px-4 py-3 hover:bg-gray-700 text-sm text-white transition-colors"
            onClick={() => addKeyframe(contextMenu.objectId, contextMenu.time)}
          >
            <span className="mr-2">⭐</span>Add Keyframe
          </button>
          <button
            className="block w-full text-left px-4 py-3 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
            onClick={() => setContextMenu(null)}
          >
            <span className="mr-2">❌</span>Cancel
          </button>
        </div>
      )}

      {/* Keyframe Editor */}
      {showKeyframeEditor && selectedKeyframe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border-2 border-gray-600 rounded-xl p-6 w-[500px] max-w-[90vw]">
            <h3 className="text-2xl font-bold mb-6 text-white">Edit Keyframe</h3>
            {(() => {
              const keyframe = keyframes.find(kf => kf.id === selectedKeyframe);
              if (!keyframe) return null;
              
              return (
                <div className="space-y-5">
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <label className="block text-lg text-gray-300 font-medium">Time: {formatTime(keyframe.time)}</label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">X Position</label>
                      <input
                        type="number"
                        value={keyframe.properties.x || 0}
                        onChange={(e) => updateKeyframeProperty(keyframe.id, 'x', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Y Position</label>
                      <input
                        type="number"
                        value={keyframe.properties.y || 0}
                        onChange={(e) => updateKeyframeProperty(keyframe.id, 'y', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Scale X</label>
                      <input
                        type="number"
                        step="0.1"
                        value={keyframe.properties.scaleX || 1}
                        onChange={(e) => updateKeyframeProperty(keyframe.id, 'scaleX', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Scale Y</label>
                      <input
                        type="number"
                        step="0.1"
                        value={keyframe.properties.scaleY || 1}
                        onChange={(e) => updateKeyframeProperty(keyframe.id, 'scaleY', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Rotation (degrees)</label>
                      <input
                        type="number"
                        value={keyframe.properties.rotation || 0}
                        onChange={(e) => updateKeyframeProperty(keyframe.id, 'rotation', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Opacity (0-1)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={keyframe.properties.opacity || 1}
                        onChange={(e) => updateKeyframeProperty(keyframe.id, 'opacity', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Easing Curve</label>
                    <select
                      value={keyframe.easing}
                      onChange={(e) => updateKeyframeEasing(keyframe.id, e.target.value as Keyframe['easing'])}
                      className="w-full px-3 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      <option value="linear">Linear (constant speed)</option>
                      <option value="ease-in">Ease In (slow start)</option>
                      <option value="ease-out">Ease Out (slow end)</option>
                      <option value="ease-in-out">Ease In-Out (smooth)</option>
                      <option value="bounce">Bounce (spring effect)</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-600">
                    <button
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
                      onClick={() => setShowKeyframeEditor(false)}
                    >
                      ✅ Done
                    </button>
                    <button
                      className="px-4 py-3 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium transition-colors"
                      onClick={() => {
                        deleteKeyframe(keyframe.id);
                        setShowKeyframeEditor(false);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* Advanced Timeline Features */}
      <div className="mt-6 space-y-4">
        {/* Enhanced Timeline Controls */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowEnhancements(!showEnhancements)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              showEnhancements 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            🎛️ {showEnhancements ? 'Hide' : 'Show'} Timeline Enhancements
          </button>
          
          <button
            onClick={() => setShowKeyframeInterpolation(!showKeyframeInterpolation)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              showKeyframeInterpolation 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            🎨 {showKeyframeInterpolation ? 'Hide' : 'Show'} Keyframe Editor
          </button>
          
          <button
            onClick={() => setShowCurveEditor(true)}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium text-white transition-colors"
          >
            📈 Animation Curves
          </button>
        </div>

        {/* Enhanced Timeline Sections with proper spacing */}
        <div className="space-y-4 mt-4">
          {showEnhancements && (
            <div className="relative z-10">
              <TimelineEnhancements
                duration={duration}
                setDuration={setDuration}
                zoom={zoom}
                setZoom={setZoom}
                snapToGrid={snapToGrid}
                setSnapToGrid={setSnapToGrid}
                onAddMarker={(t, label) => {
                  const newMarker = { id: `marker-${Date.now()}`, time: t, label: label || `Marker ${markers.length + 1}`, color: '#8B5CF6' };
                  setMarkers(prev => [...prev, newMarker]);
                }}
                onClearMarkers={handleClearMarkers}
                markers={markers}
                smoothPlayback={smoothPlayback}
                setSmoothPlayback={setSmoothPlayback}
                previewMode={previewMode}
                setPreviewMode={setPreviewMode}
                autoSave={autoSave}
                setAutoSave={setAutoSave}
                showMarkerLabels={showMarkerLabels}
                setShowMarkerLabels={setShowMarkerLabels}
                compactUIOnPlay={compactUIOnPlay}
                setCompactUIOnPlay={setCompactUIOnPlay}
                onApplyAnimationPreset={(preset) => {
                  const easingMap: Record<string, any> = {
                    'Linear': 'linear',
                    'Ease In': 'easeIn',
                    'Ease Out': 'easeOut',
                    'Bounce': 'bounce',
                  };
                  const easingValue = easingMap[preset] || 'linear';
                  
                  // Prefer selected keyframe
                  if (selectedKeyframe) {
                    handleUpdateKeyframe(selectedKeyframe, { easing: easingValue });
                    console.log(`Applied ${preset} easing to keyframe ${selectedKeyframe}`);
                    return;
                  }
                  
                  // Apply to selected object from store
                  const selectedObj = currentProject?.objects.find(obj => obj.id === selectedObject);
                  if (selectedObj) {
                    updateObject(selectedObj.id, { animationEasing: easingValue as any });
                    console.log(`Applied ${preset} easing to object ${selectedObj.id}`);
                    return;
                  }
                  
                  // Fallback: apply to the first object
                  const firstObj = currentProject?.objects[0];
                  if (firstObj) {
                    updateObject(firstObj.id, { animationEasing: easingValue as any });
                    console.log(`Applied ${preset} easing to first object ${firstObj.id} (no selection)`);
                  } else {
                    console.log('No objects to apply preset to');
                  }
                }}
              />
            </div>
          )}

          {showKeyframeInterpolation && (
            <div className="relative z-10">
              <KeyframeInterpolation
                keyframes={keyframes}
                onUpdateKeyframe={handleUpdateKeyframe}
                onDeleteKeyframe={handleDeleteKeyframe}
                currentTime={currentTime}
                duration={duration}
              />
            </div>
          )}
        </div>
      </div>

      {/* Animation Curve Editor Modal */}
      <AnimationCurveEditor
        isOpen={showCurveEditor}
        onClose={() => setShowCurveEditor(false)}
        initialCurve={currentCurve}
        onApplyCurve={handleApplyCurve}
      />
    </div>
  );
};

export default Timeline;