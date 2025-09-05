import React, { useState, useRef, useEffect } from 'react';
// import { useAppStore } from '../../../store/appStore';
import './AdvancedAudioEditor.css';

interface AudioTrack {
  id: string;
  name: string;
  file: File | null;
  url: string;
  volume: number;
  startTime: number;
  duration: number;
  waveformData: number[];
  effects: AudioEffect[];
  muted: boolean;
  solo: boolean;
}

interface AudioEffect {
  id: string;
  type: 'reverb' | 'delay' | 'distortion' | 'filter' | 'compressor' | 'eq';
  name: string;
  enabled: boolean;
  parameters: { [key: string]: number };
}

// Reserved for future waveform selection features

const AdvancedAudioEditor: React.FC = () => {
  // const { currentProject } = useAppStore();
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const waveformCanvas = useRef<HTMLCanvasElement>(null);

  const availableEffects: Omit<AudioEffect, 'id' | 'enabled'>[] = [
    {
      type: 'reverb',
      name: 'Reverb',
      parameters: { roomSize: 0.5, damping: 0.5, wetLevel: 0.3, dryLevel: 0.7 }
    },
    {
      type: 'delay',
      name: 'Delay',
      parameters: { delayTime: 0.3, feedback: 0.3, wetLevel: 0.25 }
    },
    {
      type: 'distortion',
      name: 'Distortion',
      parameters: { amount: 0.2, oversample: 1 }
    },
    {
      type: 'filter',
      name: 'Low Pass Filter',
      parameters: { frequency: 1000, resonance: 1 }
    },
    {
      type: 'compressor',
      name: 'Compressor',
      parameters: { threshold: -24, ratio: 12, attack: 0.003, release: 0.25 }
    },
    {
      type: 'eq',
      name: '3-Band EQ',
      parameters: { lowGain: 0, midGain: 0, highGain: 0 }
    }
  ];

  useEffect(() => {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext);
    if (!audioContext.current || (audioContext.current as any).state === 'closed') {
      audioContext.current = new Ctor();
    }

    const handleVisibility = () => {
      const ctx = audioContext.current;
      if (!ctx) return;
      // Autosuspend on hidden to save CPU; resume on visible
      if (document.visibilityState === 'hidden') {
        if (ctx.state === 'running') ctx.suspend().catch(() => {});
      } else {
        if (ctx.state !== 'running') ctx.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      const ctx = audioContext.current;
      if (!ctx) return;
      // Only close if not already closed
      if ((ctx as any).state && (ctx as any).state !== 'closed') {
        try {
          ctx.close().catch(() => {});
        } catch (_) {
          // swallow "Cannot close a closed AudioContext" or vendor quirks
        }
      }
      audioContext.current = null;
    };
  }, []);

  const addAudioTrack = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        const waveformData = await generateWaveformData(file);
        
        const newTrack: AudioTrack = {
          id: `track-${Date.now()}`,
          name: file.name,
          file,
          url,
          volume: 0.8,
          startTime: 0,
          duration: 0, // Will be set after loading
          waveformData,
          effects: [],
          muted: false,
          solo: false
        };
        
        setAudioTracks(prev => [...prev, newTrack]);
      }
    };
    input.click();
  };

  const generateWaveformData = async (file: File): Promise<number[]> => {
    if (!audioContext.current) return [];
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const samples = 1000; // Number of samples for visualization
      const blockSize = Math.floor(channelData.length / samples);
      const waveformData: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveformData.push(sum / blockSize);
      }
      
      return waveformData;
    } catch (error) {
      console.error('Error generating waveform:', error);
      return new Array(1000).fill(0).map(() => Math.random() * 0.5);
    }
  };

  // Waveform drawing is managed elsewhere or via future enhancements

  const addEffectToTrack = (trackId: string, effectType: AudioEffect['type']) => {
    const effectTemplate = availableEffects.find(e => e.type === effectType);
    if (!effectTemplate) return;

    const newEffect: AudioEffect = {
      id: `effect-${Date.now()}`,
      ...effectTemplate,
      enabled: true
    };

    setAudioTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, effects: [...track.effects, newEffect] }
        : track
    ));
  };

  const updateEffectParameter = (trackId: string, effectId: string, parameter: string, value: number) => {
    setAudioTracks(prev => prev.map(track => 
      track.id === trackId 
        ? {
            ...track,
            effects: track.effects.map(effect =>
              effect.id === effectId
                ? { ...effect, parameters: { ...effect.parameters, [parameter]: value } }
                : effect
            )
          }
        : track
    ));
  };

  const toggleTrackMute = (trackId: string) => {
    setAudioTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, muted: !track.muted }
        : track
    ));
  };

  const toggleTrackSolo = (trackId: string) => {
    setAudioTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, solo: !track.solo }
        : track
    ));
  };

  const exportAudioMix = () => {
    // Simulate audio export
    const exportSettings = {
      format: 'wav',
      sampleRate: 44100,
      bitDepth: 16,
      tracks: audioTracks.filter(track => !track.muted)
    };
    
    alert(`Exporting audio mix with ${exportSettings.tracks.length} tracks...\nFormat: ${exportSettings.format}\nSample Rate: ${exportSettings.sampleRate}Hz`);
  };

  const selectedTrackData = audioTracks.find(track => track.id === selectedTrack);

  return (
    <div className="advanced-audio-editor">
      <div className="audio-header">
        <h3>🎵 Advanced Audio Editor</h3>
        <div className="audio-controls">
          <button onClick={() => setIsPlaying(!isPlaying)} className="play-btn">
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <span className="time-display">
            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
          </span>
          <button onClick={addAudioTrack} className="add-track-btn">
            + Add Track
          </button>
          <button onClick={() => setShowEffectsPanel(!showEffectsPanel)} className="effects-btn">
            🎛️ Effects
          </button>
          <button onClick={exportAudioMix} className="export-btn">
            💾 Export
          </button>
        </div>
      </div>

      <div className="audio-workspace">
        <div className="tracks-panel">
          <div className="tracks-header">
            <h4>Audio Tracks</h4>
            <div className="zoom-controls">
              <button onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))}>🔍-</button>
              <span>{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.1))}>🔍+</button>
            </div>
          </div>

          {audioTracks.map(track => (
            <div key={track.id} className={`track ${selectedTrack === track.id ? 'selected' : ''}`}>
              <div className="track-controls">
                <div className="track-info">
                  <h5>{track.name}</h5>
                  <div className="track-status">
                    {track.muted && <span className="status-badge muted">M</span>}
                    {track.solo && <span className="status-badge solo">S</span>}
                  </div>
                </div>
                
                <div className="track-buttons">
                  <button 
                    onClick={() => toggleTrackMute(track.id)}
                    className={`mute-btn ${track.muted ? 'active' : ''}`}
                  >
                    🔇
                  </button>
                  <button 
                    onClick={() => toggleTrackSolo(track.id)}
                    className={`solo-btn ${track.solo ? 'active' : ''}`}
                  >
                    🎧
                  </button>
                  <button 
                    onClick={() => setSelectedTrack(track.id)}
                    className="select-btn"
                  >
                    ⚙️
                  </button>
                </div>

                <div className="volume-control">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={track.volume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setAudioTracks(prev => prev.map(t => 
                        t.id === track.id ? { ...t, volume: newVolume } : t
                      ));
                    }}
                    className="volume-slider"
                  />
                  <span className="volume-label">{Math.round(track.volume * 100)}%</span>
                </div>
              </div>

              <div className="waveform-container">
                <canvas
                  ref={waveformCanvas}
                  width={800}
                  height={80}
                  className="waveform-canvas"
                  onClick={() => setSelectedTrack(track.id)}
                />
              </div>
            </div>
          ))}

          {audioTracks.length === 0 && (
            <div className="empty-tracks">
              <p>No audio tracks added yet.</p>
              <button onClick={addAudioTrack} className="add-first-track">
                🎵 Add Your First Audio Track
              </button>
            </div>
          )}
        </div>

        {showEffectsPanel && selectedTrackData && (
          <div className="effects-panel">
            <h4>Effects for {selectedTrackData.name}</h4>
            
            <div className="add-effect">
              <h5>Add Effect:</h5>
              <div className="effect-buttons">
                {availableEffects.map(effect => (
                  <button
                    key={effect.type}
                    onClick={() => addEffectToTrack(selectedTrackData.id, effect.type)}
                    className="add-effect-btn"
                  >
                    {effect.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="active-effects">
              <h5>Active Effects:</h5>
              {selectedTrackData.effects.map(effect => (
                <div key={effect.id} className="effect-card">
                  <div className="effect-header">
                    <span>{effect.name}</span>
                    <label className="effect-toggle">
                      <input
                        type="checkbox"
                        checked={effect.enabled}
                        onChange={(e) => {
                          setAudioTracks(prev => prev.map(track => 
                            track.id === selectedTrackData.id 
                              ? {
                                  ...track,
                                  effects: track.effects.map(eff =>
                                    eff.id === effect.id
                                      ? { ...eff, enabled: e.target.checked }
                                      : eff
                                  )
                                }
                              : track
                          ));
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="effect-parameters">
                    {Object.entries(effect.parameters).map(([param, value]) => (
                      <div key={param} className="parameter">
                        <label>{param}</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={value}
                          onChange={(e) => updateEffectParameter(
                            selectedTrackData.id, 
                            effect.id, 
                            param, 
                            parseFloat(e.target.value)
                          )}
                          className="parameter-slider"
                        />
                        <span>{value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedAudioEditor;
