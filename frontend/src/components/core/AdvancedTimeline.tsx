import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import './AdvancedTimeline.css';

interface TimelineTrack {
  id: string;
  name: string;
  type: 'object' | 'audio' | 'video';
  color: string;
  visible: boolean;
  locked: boolean;
}

interface WaveformData {
  peaks: number[];
  duration: number;
}

const AdvancedTimeline: React.FC = () => {
  const { currentProject, currentTime, setCurrentTime, isPlaying, setPlaying } = useAppStore();
  const [zoom, setZoom] = useState(1);
  const [tracks] = useState<TimelineTrack[]>([
    { id: 'objects', name: 'Objects', type: 'object', color: '#3b82f6', visible: true, locked: false },
    { id: 'audio-bg', name: 'Background Music', type: 'audio', color: '#10b981', visible: true, locked: false },
    { id: 'audio-vo', name: 'Voiceover', type: 'audio', color: '#f59e0b', visible: true, locked: false }
  ]);
  const [waveformData, setWaveformData] = useState<{ [key: string]: WaveformData }>({});
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startTime: number;
    dragType: 'playhead' | 'selection' | 'object';
    targetId?: string;
  }>({ isDragging: false, startTime: 0, dragType: 'playhead' });

  const timelineRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const duration = currentProject?.duration || 30;
  const pixelsPerSecond = 50 * zoom;
  const timelineWidth = duration * pixelsPerSecond;

  // Generate audio waveform data (simulated)
  const generateWaveform = useCallback((audioId: string, audioDuration: number) => {
    const sampleCount = Math.floor(audioDuration * 100); // 100 samples per second
    const peaks = Array.from({ length: sampleCount }, () => Math.random() * 0.8 + 0.1);
    
    setWaveformData(prev => ({
      ...prev,
      [audioId]: { peaks, duration: audioDuration }
    }));
  }, []);

  // Draw waveform on canvas
  const drawWaveform = useCallback((canvas: HTMLCanvasElement, waveform: WaveformData, trackHeight: number, color: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    
    const samplesPerPixel = waveform.peaks.length / canvas.width;
    const halfHeight = trackHeight / 2;

    for (let x = 0; x < canvas.width; x++) {
      const sampleIndex = Math.floor(x * samplesPerPixel);
      const peak = waveform.peaks[sampleIndex] || 0;
      const height = peak * halfHeight;
      
      ctx.fillRect(x, halfHeight - height, 1, height * 2);
    }
  }, []);

  // Initialize audio waveforms
  useEffect(() => {
    if (currentProject?.backgroundMusic) {
      generateWaveform('background', duration);
    }
    if (currentProject?.voiceover) {
      generateWaveform('voiceover', duration);
    }
  }, [currentProject?.backgroundMusic, currentProject?.voiceover, duration, generateWaveform]);

  // Handle timeline interactions
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / timelineWidth) * duration;
    
    if (e.shiftKey && selectedRange) {
      // Extend selection
      setSelectedRange({
        start: Math.min(selectedRange.start, time),
        end: Math.max(selectedRange.end, time)
      });
    } else if (e.altKey) {
      // Start new selection
      setSelectedRange({ start: time, end: time });
      setDragState({ isDragging: true, startTime: time, dragType: 'selection' });
    } else {
      // Move playhead
      setCurrentTime(time);
      setDragState({ isDragging: true, startTime: time, dragType: 'playhead' });
    }
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(duration, (x / timelineWidth) * duration));
    
    if (dragState.dragType === 'playhead') {
      setCurrentTime(time);
    } else if (dragState.dragType === 'selection' && selectedRange) {
      setSelectedRange({
        start: Math.min(dragState.startTime, time),
        end: Math.max(dragState.startTime, time)
      });
    }
  };

  const handleTimelineMouseUp = () => {
    setDragState({ isDragging: false, startTime: 0, dragType: 'playhead' });
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Playback controls
  const togglePlayback = () => {
    setPlaying(!isPlaying);
  };

  const skipToStart = () => {
    setCurrentTime(0);
    setPlaying(false);
  };

  const skipToEnd = () => {
    setCurrentTime(duration);
    setPlaying(false);
  };

  const stepFrame = (direction: 'forward' | 'backward') => {
    const frameTime = 1 / 30; // 30fps
    const newTime = direction === 'forward' 
      ? Math.min(duration, currentTime + frameTime)
      : Math.max(0, currentTime - frameTime);
    setCurrentTime(newTime);
  };

  return (
    <div className="advanced-timeline">
      {/* Timeline Header */}
      <div className="timeline-header">
        <div className="timeline-controls">
          <button onClick={skipToStart} className="control-btn" title="Go to Start">
            ⏮
          </button>
          <button onClick={() => stepFrame('backward')} className="control-btn" title="Previous Frame">
            ⏪
          </button>
          <button onClick={togglePlayback} className="control-btn play-btn" title={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={() => stepFrame('forward')} className="control-btn" title="Next Frame">
            ⏩
          </button>
          <button onClick={skipToEnd} className="control-btn" title="Go to End">
            ⏭
          </button>
        </div>
        
        <div className="timeline-info">
          <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
          {selectedRange && (
            <span className="selection-info">
              Selection: {formatTime(selectedRange.end - selectedRange.start)}
            </span>
          )}
        </div>
        
        <div className="timeline-zoom">
          <button onClick={() => setZoom(Math.max(0.1, zoom - 0.2))} className="zoom-btn">−</button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(5, zoom + 0.2))} className="zoom-btn">+</button>
        </div>
      </div>

      {/* Time Ruler */}
      <div className="time-ruler">
        {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
          <div key={i} className="time-marker" style={{ left: `${(i / duration) * 100}%` }}>
            <div className="time-tick" />
            <div className="time-label">{i}s</div>
          </div>
        ))}
      </div>

      {/* Timeline Tracks */}
      <div className="timeline-tracks">
        {tracks.map((track) => (
          <div key={track.id} className="timeline-track">
            <div className="track-header">
              <div className="track-controls">
                <button 
                  className={`track-visibility ${track.visible ? 'visible' : 'hidden'}`}
                  onClick={() => {/* Toggle visibility */}}
                >
                  {track.visible ? '👁' : '🚫'}
                </button>
                <button 
                  className={`track-lock ${track.locked ? 'locked' : 'unlocked'}`}
                  onClick={() => {/* Toggle lock */}}
                >
                  {track.locked ? '🔒' : '🔓'}
                </button>
              </div>
              <div className="track-name" style={{ color: track.color }}>
                {track.name}
              </div>
            </div>
            
            <div 
              className="track-content"
              style={{ width: `${timelineWidth}px` }}
            >
              {/* Render track-specific content */}
              {track.type === 'audio' && waveformData[track.id] && (
                <canvas
                  ref={canvasRef}
                  width={timelineWidth}
                  height={60}
                  className="waveform-canvas"
                  onLoad={() => {
                    if (canvasRef.current) {
                      drawWaveform(canvasRef.current, waveformData[track.id], 60, track.color);
                    }
                  }}
                />
              )}
              
              {track.type === 'object' && currentProject?.objects.map((obj) => (
                <div
                  key={obj.id}
                  className="timeline-object"
                  style={{
                    left: `${(obj.animationStart || 0) * pixelsPerSecond}px`,
                    width: `${(obj.animationDuration || 2) * pixelsPerSecond}px`,
                    backgroundColor: track.color
                  }}
                  title={`${obj.type} - ${obj.id}`}
                >
                  <span className="object-label">{obj.type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Scrubber */}
      <div 
        className="timeline-scrubber"
        ref={timelineRef}
        style={{ width: `${timelineWidth}px` }}
        onMouseDown={handleTimelineMouseDown}
        onMouseMove={handleTimelineMouseMove}
        onMouseUp={handleTimelineMouseUp}
      >
        {/* Selection Range */}
        {selectedRange && (
          <div
            className="selection-range"
            style={{
              left: `${(selectedRange.start / duration) * 100}%`,
              width: `${((selectedRange.end - selectedRange.start) / duration) * 100}%`
            }}
          />
        )}
        
        {/* Playhead */}
        <div
          className="playhead"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        >
          <div className="playhead-line" />
          <div className="playhead-handle" />
        </div>
      </div>
    </div>
  );
};

export default AdvancedTimeline;
