import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

interface AudioFile {
  id: string;
  name: string;
  type: 'music' | 'voiceover';
  file: File | null;
  url: string;
  duration: number;
  size: number;
}

const AudioManager: React.FC = () => {
  const { currentProject, updateProject } = useAppStore();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentAudio) {
      const updateTime = () => setCurrentTime(currentAudio.currentTime);
      const updateDuration = () => setDuration(currentAudio.duration);
      
      currentAudio.addEventListener('timeupdate', updateTime);
      currentAudio.addEventListener('loadedmetadata', updateDuration);
      currentAudio.addEventListener('ended', () => setIsPlaying(false));
      
      return () => {
        currentAudio.removeEventListener('timeupdate', updateTime);
        currentAudio.removeEventListener('loadedmetadata', updateDuration);
        currentAudio.removeEventListener('ended', () => setIsPlaying(false));
      };
    }
  }, [currentAudio]);

  const handleFileUpload = async (type: 'music' | 'voiceover', files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) {
        alert(`${file.name} is not a valid audio file`);
        continue;
      }

      // Create audio URL for preview
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('loadedmetadata', () => {
        const newAudio: AudioFile = {
          id: `${type}-${Date.now()}-${Math.random()}`,
          name: file.name,
          type,
          file,
          url: audioUrl,
          duration: audio.duration,
          size: file.size
        };

        setAudioFiles(prev => [...prev, newAudio]);

        // Auto-assign to project if none set
        if (type === 'music' && !currentProject?.backgroundMusic) {
          updateProject({ backgroundMusic: newAudio.id });
        } else if (type === 'voiceover' && !currentProject?.voiceover) {
          updateProject({ voiceover: newAudio.id });
        }
      });
    }
  };

  const playAudio = (audioFile: AudioFile) => {
    if (currentAudio) {
      currentAudio.pause();
    }

    const audio = new Audio(audioFile.url);
    audio.volume = volume;
    setCurrentAudio(audio);
    audio.play();
    setIsPlaying(true);
  };

  const pauseAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const setAudioAsBackground = (audioId: string, type: 'music' | 'voiceover') => {
    if (type === 'music') {
      updateProject({ backgroundMusic: audioId });
    } else {
      updateProject({ voiceover: audioId });
    }
  };

  const removeAudio = (audioId: string) => {
    const audioFile = audioFiles.find(a => a.id === audioId);
    if (audioFile) {
      URL.revokeObjectURL(audioFile.url);
      setAudioFiles(prev => prev.filter(a => a.id !== audioId));
      
      // Clear from project if assigned
      if (currentProject?.backgroundMusic === audioId) {
        updateProject({ backgroundMusic: undefined });
      }
      if (currentProject?.voiceover === audioId) {
        updateProject({ voiceover: undefined });
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const musicFiles = audioFiles.filter(a => a.type === 'music');
  const voiceFiles = audioFiles.filter(a => a.type === 'voiceover');

  return (
    <div className="h-full overflow-y-auto">
      <h4 className="text-sm font-semibold text-gray-300 mb-4">Audio Manager</h4>
      
      {/* Audio Controls */}
      {currentAudio && (
        <div className="bg-gray-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => isPlaying ? pauseAudio() : currentAudio.play()}
              className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button
              onClick={stopAudio}
              className="w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center text-white"
            >
              ⏹️
            </button>
            <div className="flex-1 text-xs text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                if (currentAudio) currentAudio.volume = newVolume;
              }}
              className="flex-1"
            />
            <span className="text-xs text-gray-400">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Background Music Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-medium text-gray-300">Background Music</h5>
          <button
            onClick={() => musicInputRef.current?.click()}
            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
          >
            Add Music
          </button>
        </div>
        
        <input
          ref={musicInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={(e) => handleFileUpload('music', e.target.files)}
          className="hidden"
        />

        <div className="space-y-2 max-h-32 overflow-y-auto">
          {musicFiles.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              No background music added
            </div>
          ) : (
            musicFiles.map((audio) => (
              <div
                key={audio.id}
                className={`bg-gray-700 rounded p-2 ${
                  currentProject?.backgroundMusic === audio.id ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{audio.name}</div>
                    <div className="text-xs text-gray-400">
                      {formatTime(audio.duration)} • {formatFileSize(audio.size)}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => playAudio(audio)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                      title="Play"
                    >
                      ▶️
                    </button>
                    <button
                      onClick={() => setAudioAsBackground(audio.id, 'music')}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                      title="Set as background"
                    >
                      ⭐
                    </button>
                    <button
                      onClick={() => removeAudio(audio.id)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Voiceover Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-medium text-gray-300">Voiceover</h5>
          <button
            onClick={() => voiceInputRef.current?.click()}
            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
          >
            Add Voice
          </button>
        </div>
        
        <input
          ref={voiceInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={(e) => handleFileUpload('voiceover', e.target.files)}
          className="hidden"
        />

        <div className="space-y-2 max-h-32 overflow-y-auto">
          {voiceFiles.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              No voiceover added
            </div>
          ) : (
            voiceFiles.map((audio) => (
              <div
                key={audio.id}
                className={`bg-gray-700 rounded p-2 ${
                  currentProject?.voiceover === audio.id ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{audio.name}</div>
                    <div className="text-xs text-gray-400">
                      {formatTime(audio.duration)} • {formatFileSize(audio.size)}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => playAudio(audio)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                      title="Play"
                    >
                      ▶️
                    </button>
                    <button
                      onClick={() => setAudioAsBackground(audio.id, 'voiceover')}
                      className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                      title="Set as voiceover"
                    >
                      🎤
                    </button>
                    <button
                      onClick={() => removeAudio(audio.id)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Current Project Audio Status */}
      {currentProject && (currentProject.backgroundMusic || currentProject.voiceover) && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <h6 className="text-xs font-medium text-gray-400 mb-2">Project Audio</h6>
          {currentProject.backgroundMusic && (
            <div className="text-xs text-green-400">
              🎵 Background: {musicFiles.find(a => a.id === currentProject.backgroundMusic)?.name || 'Unknown'}
            </div>
          )}
          {currentProject.voiceover && (
            <div className="text-xs text-purple-400">
              🎤 Voiceover: {voiceFiles.find(a => a.id === currentProject.voiceover)?.name || 'Unknown'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioManager;
