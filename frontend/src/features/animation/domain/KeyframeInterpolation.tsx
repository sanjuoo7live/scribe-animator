import React from 'react';

interface KeyframeInterpolationProps {
  keyframes: Array<{
    id: string;
    time: number;
    properties: Record<string, number>;
    easing: string;
  }>;
  onUpdateKeyframe: (id: string, updates: any) => void;
  onDeleteKeyframe: (id: string) => void;
  currentTime: number;
  duration: number;
}

interface InterpolationCurve {
  name: string;
  icon: string;
  description: string;
  func: (t: number) => number;
}

const KeyframeInterpolation: React.FC<KeyframeInterpolationProps> = ({
  keyframes,
  onUpdateKeyframe,
  onDeleteKeyframe,
  currentTime,
  duration,
}) => {
  const [selectedKeyframe, setSelectedKeyframe] = React.useState<string | null>(null);
  const [showCurveEditor, setShowCurveEditor] = React.useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = React.useState(false);
  const [copiedKeyframes, setCopiedKeyframes] = React.useState<any[]>([]);

  // Helper functions for the new features
  const previewAnimation = () => {
    if (keyframes.length === 0) return;
    
    setIsPreviewPlaying(true);
    // Simple preview: cycle through keyframe times
    let currentIndex = 0;
    const previewInterval = setInterval(() => {
      if (currentIndex < keyframes.length) {
        // You could emit an event here to update the timeline position
        console.log(`Preview: Moving to keyframe at ${keyframes[currentIndex].time}s`);
        currentIndex++;
      } else {
        clearInterval(previewInterval);
        setIsPreviewPlaying(false);
      }
    }, 500); // 500ms between keyframe previews
  };

  const copyKeyframes = () => {
    if (keyframes.length === 0) return;
    
    setCopiedKeyframes([...keyframes]);
    // Show temporary notification
    const notification = document.createElement('div');
    notification.textContent = `Copied ${keyframes.length} keyframes to clipboard`;
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 2000);
  };

  const reverseKeyframes = () => {
    if (keyframes.length === 0) return;
    
    const maxTime = Math.max(...keyframes.map(kf => kf.time));
    keyframes.forEach(keyframe => {
      const newTime = maxTime - keyframe.time;
      onUpdateKeyframe(keyframe.id, { time: newTime });
    });
  };

  const distributeEvenly = () => {
    if (keyframes.length < 2) return;
    
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);
    const firstTime = sortedKeyframes[0].time;
    const lastTime = sortedKeyframes[sortedKeyframes.length - 1].time;
    const timeSpan = lastTime - firstTime;
    
    if (timeSpan <= 0) return;
    
    sortedKeyframes.forEach((keyframe, index) => {
      if (index === 0 || index === sortedKeyframes.length - 1) return; // Keep first and last
      const newTime = firstTime + (timeSpan * index) / (sortedKeyframes.length - 1);
      onUpdateKeyframe(keyframe.id, { time: newTime });
    });
  };

  const interpolationCurves: InterpolationCurve[] = [
    {
      name: 'linear',
      icon: '📏',
      description: 'Constant speed throughout',
      func: (t: number) => t,
    },
    {
      name: 'ease-in',
      icon: '🚀',
      description: 'Slow start, accelerating',
      func: (t: number) => t * t,
    },
    {
      name: 'ease-out',
      icon: '🛑',
      description: 'Fast start, decelerating',
      func: (t: number) => 1 - (1 - t) * (1 - t),
    },
    {
      name: 'ease-in-out',
      icon: '🌊',
      description: 'Smooth acceleration and deceleration',
      func: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    },
    {
      name: 'bounce',
      icon: '🏀',
      description: 'Spring bounce effect',
      func: (t: number) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
      },
    },
    {
      name: 'elastic',
      icon: '🎸',
      description: 'Elastic spring effect',
      func: (t: number) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
      },
    },
    {
      name: 'back',
      icon: '↩️',
      description: 'Slight overshoot and return',
      func: (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
      },
    },
    {
      name: 'anticipate',
      icon: '🎯',
      description: 'Pull back before moving forward',
      func: (t: number) => (2 * t - 1) * (2 * t - 1) * (2 * t - 1) + 0.5,
    },
  ];

  const selectedKf = selectedKeyframe ? keyframes.find(kf => kf.id === selectedKeyframe) : null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const generateCurvePreview = (curve: InterpolationCurve) => {
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = curve.func(t);
      points.push(`${t * 40},${20 - y * 20}`);
    }
    return `M${points.join('L')}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 max-h-80 overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-800 z-10 pb-2 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">🎨 Keyframe Interpolation</h3>
          <button
            onClick={() => setShowCurveEditor(!showCurveEditor)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
          >
            {showCurveEditor ? '📊 Hide Curves' : '📈 Show Curves'}
          </button>
        </div>

        {/* Keyframe List */}
        <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">{/* Reduced from max-h-40 to max-h-32 */}
        {keyframes.length === 0 ? (
          <div className="text-gray-400 text-center py-4">
            <div className="text-2xl mb-2">🎬</div>
            <div>No keyframes yet. Right-click on purple bars to add keyframes!</div>
          </div>
        ) : (
          keyframes.map((keyframe, index) => (
            <div
              key={keyframe.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedKeyframe === keyframe.id
                  ? 'bg-blue-600 border-blue-400'
                  : 'bg-gray-700 border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => setSelectedKeyframe(keyframe.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${
                    Math.abs(keyframe.time - currentTime) < 0.1 ? 'bg-yellow-400' : 'bg-purple-400'
                  }`} />
                  <div>
                    <div className="text-white font-medium">
                      Keyframe #{index + 1}
                    </div>
                    <div className="text-gray-300 text-sm">
                      {formatTime(keyframe.time)} • {keyframe.easing}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-400">
                    {Object.keys(keyframe.properties).length} props
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteKeyframe(keyframe.id);
                    }}
                    className="w-6 h-6 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Keyframe Properties */}
              {selectedKeyframe === keyframe.id && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {Object.entries(keyframe.properties).map(([prop, value]) => (
                      <div key={prop}>
                        <label className="block text-xs text-gray-400 mb-1">{prop}</label>
                        <input
                          type="number"
                          value={value}
                          step={prop.includes('opacity') ? 0.1 : prop.includes('scale') ? 0.1 : 1}
                          onChange={(e) => onUpdateKeyframe(keyframe.id, {
                            properties: { ...keyframe.properties, [prop]: Number(e.target.value) }
                          })}
                          className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Interpolation Curves */}
      {showCurveEditor && (
        <div>
          <h4 className="text-sm font-medium text-white mb-3">🎭 Animation Curves</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {interpolationCurves.map((curve) => (
              <button
                key={curve.name}
                onClick={() => {
                  if (selectedKf) {
                    onUpdateKeyframe(selectedKf.id, { easing: curve.name });
                  }
                }}
                className={`p-3 rounded-lg border transition-all ${
                  selectedKf?.easing === curve.name
                    ? 'bg-purple-600 border-purple-400'
                    : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                }`}
                disabled={!selectedKf}
              >
                <div className="text-center">
                  <div className="text-lg mb-1">{curve.icon}</div>
                  <div className="text-xs font-medium text-white mb-1">{curve.name}</div>
                  
                  {/* Curve Preview */}
                  <svg width="40" height="20" className="mx-auto mb-1" viewBox="0 0 40 20">
                    <defs>
                      <linearGradient id={`gradient-${curve.name}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#A855F7" />
                      </linearGradient>
                    </defs>
                    <path
                      d={generateCurvePreview(curve)}
                      stroke={selectedKf?.easing === curve.name ? '#FFFFFF' : `url(#gradient-${curve.name})`}
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                  
                  <div className="text-xs text-gray-400">{curve.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={previewAnimation}
            disabled={keyframes.length === 0 || isPreviewPlaying}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm text-white transition-colors"
          >
            🎬 {isPreviewPlaying ? 'Previewing...' : 'Preview Animation'}
          </button>
          <button
            onClick={copyKeyframes}
            disabled={keyframes.length === 0}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm text-white transition-colors"
          >
            📋 Copy Keyframes ({keyframes.length})
          </button>
          <button
            onClick={reverseKeyframes}
            disabled={keyframes.length === 0}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm text-white transition-colors"
          >
            🔄 Reverse Order
          </button>
          <button
            onClick={distributeEvenly}
            disabled={keyframes.length < 2}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm text-white transition-colors"
          >
            📐 Distribute Evenly
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default KeyframeInterpolation;
