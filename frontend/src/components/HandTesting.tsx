import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { HAND_ASSETS, TOOL_ASSETS, HAND_TOOL_COMPATIBILITY, HandAsset as ProHandAsset, ToolAsset as ProToolAsset, Size2D } from '../types/handAssets';
import { HandToolCompositor } from '../utils/handToolCompositor';
import ThreeLayerDemo from './ThreeLayerDemo';

const HandTesting: React.FC = () => {
  const [testingMode, setTestingMode] = useState<'simple' | 'professional' | 'demo'>('simple');
  
  // Simple mode (current implementation)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tipPosition, setTipPosition] = useState({ x: 75, y: 87 });
  
  // Professional mode (three-layer system)
  const [selectedHand, setSelectedHand] = useState<string>('hand_right_pen_grip');
  const [selectedTool, setSelectedTool] = useState<string>('pen_blue_ballpoint');
  // Start smaller by default so large, high-res hands don't overwhelm the canvas
  const [handScale, setHandScale] = useState<number>(0.2);
  const [debugOverlay, setDebugOverlay] = useState<boolean>(true);
  const [drawingStyle, setDrawingStyle] = useState<'precise' | 'sketchy' | 'artistic' | 'calligraphy'>('precise');
  // Upload set (hand_bg + tool + hand_fg)
  const [useUploadedSet, setUseUploadedSet] = useState<boolean>(false);
  const [handBgFile, setHandBgFile] = useState<File | null>(null);
  const [handFgFile, setHandFgFile] = useState<File | null>(null);
  const [toolFile, setToolFile] = useState<File | null>(null);
  const [handBgUrl, setHandBgUrl] = useState<string | null>(null);
  const [handFgUrl, setHandFgUrl] = useState<string | null>(null);
  const [toolUrl, setToolUrl] = useState<string | null>(null);
  const [handSize, setHandSize] = useState<Size2D | null>(null);
  const [toolSize, setToolSize] = useState<Size2D | null>(null);
  const [customHandAsset, setCustomHandAsset] = useState<ProHandAsset | null>(null);
  const [customToolAsset, setCustomToolAsset] = useState<ProToolAsset | null>(null);
  const [savingAssets, setSavingAssets] = useState(false);
  // Two-bone system removed; keeping UI focused on three-layer mode
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentProject, addObject, currentTime } = useAppStore();

  // Preset demo asset URLs served by backend (backend/server.js /api/assets)
  // Resolve API base robustly: prefer env, fall back to localhost in dev, else relative for prod
  const apiBase = React.useMemo(() => {
    const fromEnv = process.env.REACT_APP_API_BASE as string | undefined;
    if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      // If a port is present, we're likely in dev; point to backend on 3001 at same host
      if (port && port.length > 0) {
        return `${protocol}//${hostname}:3001`;
      }
      // Also handle explicit localhost without port
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:3001`;
      }
    }
    return '';
  }, []);
  // Final demo URLs are resolved at runtime in createDirectDemo using a working base

  // Helpers
  const loadImgDims = (url: string): Promise<Size2D> => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
    img.onerror = reject;
    img.src = url;
  });

  const toObjectUrl = (f: File | null) => (f ? URL.createObjectURL(f) : null);

  useEffect(() => {
    // Create blob URLs and measure when files change
    const bg = toObjectUrl(handBgFile);
    const fg = toObjectUrl(handFgFile);
    const tl = toObjectUrl(toolFile);
    if (bg) setHandBgUrl(bg); else setHandBgUrl(null);
    if (fg) setHandFgUrl(fg); else setHandFgUrl(null);
    if (tl) setToolUrl(tl); else setToolUrl(null);

    (async () => {
      try {
        if (bg) setHandSize(await loadImgDims(bg));
        if (tl) setToolSize(await loadImgDims(tl));
      } catch {}
    })();

    return () => {
      if (bg) URL.revokeObjectURL(bg);
      if (fg) URL.revokeObjectURL(fg);
      if (tl) URL.revokeObjectURL(tl);
    };
  }, [handBgFile, handFgFile, toolFile]);

  // Build custom asset objects when all three are present
  useEffect(() => {
    if (!useUploadedSet) { setCustomHandAsset(null); setCustomToolAsset(null); return; }
    if (!handBgUrl || !handFgUrl || !toolUrl || !handSize || !toolSize) return;

    // Default anchors and metadata (can be calibrated later)
    const hb = handSize;
    const tb = toolSize;
    const hand: ProHandAsset = {
      id: `custom-hand-${Date.now()}`,
      name: 'Custom Hand',
      imageBg: handBgUrl,
      imageFg: handFgUrl,
      sizePx: { w: hb.w, h: hb.h },
      gripBase: { x: Math.round(hb.w * 0.45), y: Math.round(hb.h * 0.53) },
      gripForward: { x: Math.round(hb.w * 0.65), y: Math.round(hb.h * 0.53) },
      naturalTiltDeg: -5,
      mirrorable: true
    };

    const tool: ProToolAsset = {
      id: `custom-tool-${Date.now()}`,
      name: 'Custom Tool',
      image: toolUrl,
      sizePx: { w: tb.w, h: tb.h },
      socketBase: { x: Math.round(tb.w * 0.30), y: Math.round(tb.h * 0.50) },
      socketForward: { x: Math.round(tb.w * 0.92), y: Math.round(tb.h * 0.50) },
      tipAnchor: { x: Math.round(tb.w * 0.97), y: Math.round(tb.h * 0.50) },
      rotationOffsetDeg: 0
    };

    setCustomHandAsset(hand);
    setCustomToolAsset(tool);
  }, [useUploadedSet, handBgUrl, handFgUrl, toolUrl, handSize, toolSize]);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, GIF, or SVG)');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Save uploaded assets to backend as hand_bg.png, hand_fg.png, tool.png
  const saveAssetsToBackend = async () => {
    setSavingAssets(true);
    try {
      const saveAsset = async (file: File, assetType: string) => {
        const formData = new FormData();
        formData.append('asset', file);
        formData.append('assetType', assetType);

        const response = await fetch(`${apiBase}/api/upload-hand-asset`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to save ${assetType}: ${response.statusText}`);
        }

        return response.json();
      };

      const saved: string[] = [];

      // Save what's available; allow partial saves so the button is useful earlier
      if (handBgFile) {
        await saveAsset(handBgFile, 'hand_bg');
        saved.push('hand_bg.png');
      }
      if (toolFile) {
        await saveAsset(toolFile, 'tool');
        saved.push('tool.png');
      }
      // Save hand foreground (uploaded file)
      if (handFgFile) {
        await saveAsset(handFgFile, 'hand_fg');
        saved.push('hand_fg.png');
      }

      if (saved.length === 0) {
        alert('Please upload at least one asset before saving (hand background, tool, or hand foreground).');
      } else {
        alert(`✅ Saved: ${saved.join(', ')}\nLocation: /api/assets/`);
      }
      
    } catch (error) {
      console.error('Error saving assets:', error);
      alert('❌ Failed to save assets: ' + (error as Error).message);
    } finally {
      setSavingAssets(false);
    }
  };

  const createTestPath = () => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    if (testingMode === 'simple') {
      createSimpleTestPath();
    } else {
      createProfessionalTestPath();
    }
  };

  const createSimpleTestPath = () => {
    // Create a simple test path for hand following (original implementation)
    const testPath = {
      id: `path-${Date.now()}`,
      type: 'drawPath' as const,
      x: 50,
      y: 50,
      width: 400,
      height: 300,
      properties: {
        points: [
          { x: 50, y: 150 },
          { x: 100, y: 100 },
          { x: 200, y: 120 },
          { x: 300, y: 80 },
          { x: 400, y: 100 },
          { x: 450, y: 150 }
        ],
        stroke: '#2563eb',
        strokeWidth: 3,
        handFollower: {
          enabled: true,
          handImageUrl: previewUrl || '',
          tipAnchor: tipPosition,
          smoothing: {
            enabled: true,
            strength: 0.7,
            lookahead: 3
          },
          cornerLift: {
            enabled: true,
            sensitivity: 25,
            liftHeight: 20,
            liftDuration: 0.3
          }
        }
      },
      animationStart: currentTime,
      animationDuration: 5,
      animationType: 'drawIn' as const,
      animationEasing: 'easeOut' as const
    };

    addObject(testPath);
    alert('✅ Simple test path created with hand follower!');
  };

  const createProfessionalTestPath = () => {
    // Create a professional three-layer test path
  const handAsset = useUploadedSet && customHandAsset ? customHandAsset : HAND_ASSETS.find(h => h.id === selectedHand);
  const toolAsset = useUploadedSet && customToolAsset ? customToolAsset : TOOL_ASSETS.find(t => t.id === selectedTool);
    
    if (!handAsset || !toolAsset) {
      alert('Please select both hand and tool assets');
      return;
    }

    const testPath = {
      id: `path-${Date.now()}`,
      type: 'svgPath' as const,  // Changed from 'drawPath' to match SvgPathRenderer
      x: 50,
      y: 50,
      width: 400,
      height: 300,
      properties: {
        paths: [
          {
            d: `M 50 150 L 100 100 L 200 120 L 300 80 L 400 100 L 450 150`,
            stroke: '#2563eb',
            strokeWidth: 3,
            fill: 'none',
            len: 400  // approximate length
          }
        ],
        totalLen: 400,
        handFollower: {
          enabled: true,
          mode: 'professional',
          handAsset: handAsset,
          toolAsset: toolAsset,
          scale: handScale,
          smoothing: {
            enabled: true,
            strength: 0.7,
            lookahead: 3
          },
          cornerLift: {
            enabled: true,
            sensitivity: 25,
            liftHeight: 20,
            liftDuration: 0.3
          }
        }
      },
      animationStart: currentTime,
      animationDuration: 5,
      animationType: 'drawIn' as const,
      animationEasing: 'easeOut' as const
    };

  addObject(testPath);
  alert(`✅ Professional test path created!\nHand: ${handAsset.name}\nTool: ${toolAsset.name}`);
  };

  // Direct demo using provided preset images
  const createDirectDemo = async () => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    // Measure images (try load without crossOrigin to avoid CORS constraints)
    const dims = async (url: string): Promise<Size2D> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
        img.onerror = (e) => {
          console.error('Failed to load image', url, e);
          reject(e);
        };
        // Cache-bust in dev to avoid stale responses
        const bust = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
        img.src = bust;
      });
    };

    try {
      // Resolve a working API base by trying candidates
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const candidates = Array.from(new Set([
        apiBase,
        `${origin.replace(/:\d+$/, '')}:3001`,
        'http://localhost:3001',
        origin,
      ].filter(Boolean)));

      let workingBase: string | null = null;
      let lastErr: any = null;
      for (const base of candidates) {
        try {
          await dims(`${base}/api/assets/hand_bg.png`);
          workingBase = base;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!workingBase) throw lastErr || new Error('No working backend base for /api/assets');

      const HAND_BG_URL = `${workingBase}/api/assets/hand_bg.png`;
      const HAND_FG_URL = `${workingBase}/api/assets/hand_fg.png`;
      const TOOL_URL = `${workingBase}/api/assets/tool.png`;

      const [hb, tb] = await Promise.all([dims(HAND_BG_URL), dims(TOOL_URL)]);
      const hand: ProHandAsset = {
        id: 'demo-hand-right',
        name: 'Demo Right Hand',
        imageBg: HAND_BG_URL,
        imageFg: HAND_FG_URL,
        sizePx: { w: hb.w, h: hb.h },
        gripBase: { x: Math.round(hb.w * 0.46), y: Math.round(hb.h * 0.55) },
        gripForward: { x: Math.round(hb.w * 0.66), y: Math.round(hb.h * 0.56) },
        naturalTiltDeg: -5,
        mirrorable: true
      };
      const tool: ProToolAsset = {
        id: 'demo-tool-pen',
        name: 'Demo Pen',
        image: TOOL_URL,
        sizePx: { w: tb.w, h: tb.h },
        socketBase: { x: Math.round(tb.w * 0.62), y: Math.round(tb.h * 0.50) },
        socketForward: { x: Math.round(tb.w * 0.94), y: Math.round(tb.h * 0.50) },
        tipAnchor: { x: Math.round(tb.w * 0.10), y: Math.round(tb.h * 0.66) },
        rotationOffsetDeg: 0
      };

      console.log('[HandTesting] Creating demo with debug:', debugOverlay);
      
      const testPath = {
        id: `path-${Date.now()}`,
        type: 'svgPath' as const,  // Changed from 'drawPath' to match SvgPathRenderer
        x: 50,
        y: 50,
        width: 520,
        height: 340,
        properties: {
          paths: [
            {
              d: `M 50 150 L 120 110 L 240 130 L 360 90 L 480 130 L 520 180`,
              stroke: '#374151',
              strokeWidth: 3,
              fill: 'none',
              len: 500  // approximate length
            }
          ],
          totalLen: 500,
          handFollower: {
            enabled: true,
            mode: 'professional',
            handAsset: hand,
            toolAsset: tool,
            scale: handScale,
            visible: true,
            debug: debugOverlay
          }
        },
        animationStart: currentTime,
        animationDuration: 5,
        animationType: 'drawIn' as const,
        animationEasing: 'easeOut' as const
      };

      console.log('[HandTesting] Created path with handFollower:', testPath.properties.handFollower);

      addObject(testPath);
  alert('▶ Direct Demo created. Assets loaded from ' + workingBase + '');
    } catch (e) {
      console.error(e);
  alert(`Failed to load demo images. Check backend at:
${apiBase || '[no env base]'}
http://localhost:3001
${typeof window !== 'undefined' ? window.location.origin : ''}

Open these directly in your browser to verify:
http://localhost:3001/api/assets/hand_bg.png
http://localhost:3001/api/assets/hand_fg.png
http://localhost:3001/api/assets/tool.png`);
    }
  };

  const suggestCombination = () => {
    const suggestion = HandToolCompositor.suggestHandToolCombination(drawingStyle, 'right');
    setSelectedHand(suggestion.handId);
    setSelectedTool(suggestion.toolId);
    alert(`Suggested combination for ${drawingStyle} style:\nHand: ${HAND_ASSETS.find(h => h.id === suggestion.handId)?.name}\nTool: ${TOOL_ASSETS.find(t => t.id === suggestion.toolId)?.name}`);
  };

  const getCompatibleTools = () => {
    return HAND_TOOL_COMPATIBILITY[selectedHand] || [];
  };

  const presets = [
    { name: 'Pen Tip', x: 75, y: 87, description: 'Standard pen tip position' },
    { name: 'Finger Tip', x: 80, y: 90, description: 'Index finger tip' },
    { name: 'Brush Tip', x: 70, y: 85, description: 'Paintbrush tip position' },
    { name: 'Center', x: 50, y: 50, description: 'Center of hand' }
  ];

  return (
    <div className="space-y-6 p-4 text-white">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">🖐️ Hand Follower Testing</h3>
        <p className="text-gray-400 text-sm">
          Test hand following animations with simple or professional three-layer rendering
        </p>
      </div>

      {/* Quick Demo (three-layer only) */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-300">Quick Demos</div>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={createDirectDemo}
            className="w-full p-2 rounded bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white text-sm"
          >
            ▶ Run Direct Demo (preset 3-layer)
          </button>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-4">
        <div className="text-sm font-semibold text-gray-300">Testing Mode</div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setTestingMode('simple')}
            className={`p-2 rounded-lg border transition-all text-xs ${
              testingMode === 'simple'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="font-semibold">📷 Simple</div>
            <div className="opacity-75">Single image</div>
          </button>
          <button
            onClick={() => setTestingMode('professional')}
            className={`p-2 rounded-lg border transition-all text-xs ${
              testingMode === 'professional'
                ? 'bg-orange-600 border-orange-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="font-semibold">🎭 Professional</div>
            <div className="opacity-75">Three layers</div>
          </button>
          <button
            onClick={() => setTestingMode('demo')}
            className={`p-2 rounded-lg border transition-all text-xs ${
              testingMode === 'demo'
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <div className="font-semibold">🎯 Demo</div>
            <div className="opacity-75">How it works</div>
          </button>
        </div>
      </div>

  {/* Two-bone testing UI removed */}

      {/* Simple Mode Interface */}
      {testingMode === 'simple' && (
        <>
          {/* File Upload Area */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-300">1. Upload Hand Image</div>
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              
              {previewUrl ? (
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Hand preview"
                    className="w-full max-w-24 max-h-16 mx-auto rounded-lg border border-gray-600 object-contain"
                  />
                  <div className="text-green-400 font-semibold">✅ {selectedFile?.name}</div>
                  <div className="text-xs text-gray-400">Click to change image</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📁</div>
                  <div className="text-gray-300">
                    Drop hand image here or click to browse
                  </div>
                  <div className="text-xs text-gray-500">
                    PNG, JPG, GIF, or SVG
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tip Position Calibration */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-300">2. Set Pen Tip Position</div>
            
            {/* Preset Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setTipPosition({ x: preset.x, y: preset.y })}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors border border-gray-600"
                >
                  <div className="font-semibold">{preset.name}</div>
                  <div className="text-gray-400">{preset.description}</div>
                </button>
              ))}
            </div>

            {/* Position Display */}
            <div className="bg-gray-800 p-3 rounded border border-gray-600">
              <div className="text-xs text-gray-400 mb-1">Current Tip Position:</div>
              <div className="font-mono text-sm">
                X: {tipPosition.x}% | Y: {tipPosition.y}%
              </div>
            </div>
          </div>
        </>
      )}

      {/* Professional Mode Interface */}
      {testingMode === 'professional' && (
        <>
          {/* Direct Demo */}
          <div className="space-y-2">
            <button
              onClick={createDirectDemo}
              className="w-full p-2 rounded bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white text-sm"
            >
              ▶ Run Direct Demo (use preset images)
            </button>
            <div className="text-xs text-gray-400">Uses backend files: {apiBase || ''}/api/assets/hand_bg.png, hand_fg.png, tool.png</div>
          </div>
          {/* Uploaded Set Toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useUploadedSet}
                onChange={(e) => setUseUploadedSet(e.target.checked)}
              />
              <span>Use my own Hand + Tool set (upload three images)</span>
            </label>
            {useUploadedSet && (
              <div className="grid grid-cols-1 gap-3">
                {/* Hand BG */}
                <div className="p-3 rounded border border-gray-600 bg-gray-800/50">
                  <div className="text-xs font-semibold text-gray-300 mb-2">Hand Background (palm) PNG</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setHandBgFile(e.target.files?.[0] || null)}
                    className="w-full text-xs"
                  />
                  {handBgUrl && (
                    <img src={handBgUrl} alt="hand bg" className="w-full max-w-24 max-h-16 object-contain border border-gray-700 rounded bg-gray-900/30" />
                  )}
                </div>
                {/* Tool */}
                <div className="p-3 rounded border border-gray-600 bg-gray-800/50">
                  <div className="text-xs font-semibold text-gray-300 mb-2">Tool (pen/marker/brush) PNG/SVG</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setToolFile(e.target.files?.[0] || null)}
                    className="w-full text-xs"
                  />
                  {toolUrl && (
                    <img src={toolUrl} alt="tool" className="w-full max-w-24 max-h-16 object-contain border border-gray-700 rounded bg-gray-900/30" />
                  )}
                </div>
                {/* Hand FG */}
                <div className="p-3 rounded border border-gray-600 bg-gray-800/50">
                  <div className="text-xs font-semibold text-gray-300 mb-2">Hand Foreground (fingers) PNG</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setHandFgFile(e.target.files?.[0] || null)}
                    className="w-full text-xs"
                  />
                  {handFgUrl && (
                    <img src={handFgUrl} alt="hand fg" className="w-full max-w-24 max-h-16 object-contain border border-gray-700 rounded bg-gray-900/30" />
                  )}
                </div>
                
                {/* Status */}
                <div className="text-xs text-gray-400">
                  {customHandAsset && customToolAsset
                    ? '✅ Custom set ready. You can tweak scale below and create the test.'
                    : 'Tip: You can save any subset (BG/FG/Tool). Missing parts can be added later.'}
                </div>

                {/* Save to Backend Assets - always shown for visibility */}
                <button
                  onClick={saveAssetsToBackend}
                  disabled={savingAssets}
                  className="w-full p-2 rounded bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm"
                >
                  {savingAssets ? '💾 Saving...' : '💾 Save to Backend Assets (hand_bg.png, hand_fg.png, tool.png)'}
                </button>
              </div>
            )}
          </div>

          {/* Drawing Style Selection */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-300">1. Choose Drawing Style</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'precise', name: 'Precise', icon: '✏️', desc: 'Technical drawing' },
                { id: 'sketchy', name: 'Sketchy', icon: '✍️', desc: 'Loose sketching' },
                { id: 'artistic', name: 'Artistic', icon: '🎨', desc: 'Painterly style' },
                { id: 'calligraphy', name: 'Calligraphy', icon: '🖋️', desc: 'Elegant writing' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setDrawingStyle(style.id as any)}
                  className={`p-2 rounded text-xs transition-all border ${
                    drawingStyle === style.id
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-semibold">{style.icon} {style.name}</div>
                  <div className="opacity-75">{style.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={suggestCombination}
              className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm border border-gray-600 transition-colors"
            >
              💡 Auto-suggest Hand & Tool
            </button>
          </div>

          {/* Hand Selection */}
          {!useUploadedSet && (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-300">2. Select Hand Asset</div>
            <select
              value={selectedHand}
              onChange={(e) => setSelectedHand(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              {HAND_ASSETS.map((hand) => (
                <option key={hand.id} value={hand.id}>
                  {hand.name} - {hand.description}
                </option>
              ))}
            </select>
          </div>
          )}

          {/* Tool Selection */}
          {!useUploadedSet && (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-300">3. Select Tool Asset</div>
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              {TOOL_ASSETS.filter(tool => getCompatibleTools().includes(tool.id)).map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name} - {tool.description}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500">
              Only showing tools compatible with selected hand
            </div>
          </div>
          )}

          {/* Scale Control */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-300">4. Hand Scale</div>
            <div className="space-y-2">
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={handScale}
                onChange={(e) => setHandScale(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-400">
                Scale: {handScale}x
              </div>
            </div>
          </div>
          {/* Debug overlay toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={debugOverlay} onChange={(e) => setDebugOverlay(e.target.checked)} />
              <span>Show debug overlay (bounds & tip)</span>
            </label>
          </div>
        </>
      )}

      {/* Three-Layer Demo Mode */}
      {testingMode === 'demo' && (
        <ThreeLayerDemo />
      )}

      {/* Test Controls - Only show for simple and professional modes */}
      {testingMode !== 'demo' && (
      <div className="space-y-4">
        <div className="text-sm font-semibold text-gray-300">
          {testingMode === 'simple' ? '3. Create Test Animation' : '5. Create Test Animation'}
        </div>
        
        <button
          onClick={createTestPath}
          disabled={!currentProject || (testingMode === 'simple' && !previewUrl) || (testingMode === 'professional' && useUploadedSet && !(customHandAsset && customToolAsset))}
          className="w-full p-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-gray-600 disabled:to-gray-700 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
        >
          {currentProject ? (
            <div>
              <div className="text-lg">🚀 Create {testingMode === 'professional' ? 'Professional' : 'Simple'} Test</div>
              <div className="text-sm opacity-80">
                {testingMode === 'professional' 
                  ? 'Three-layer hand + tool composition'
                  : 'Single hand image following'
                }
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg">📝 Create Project First</div>
              <div className="text-sm opacity-80">
                You need an active project to test
              </div>
            </div>
          )}
        </button>

        {/* Feature Info */}
        <div className="grid grid-cols-1 gap-3 text-xs">
          <div className="p-3 bg-gray-800 rounded border border-gray-600">
            <div className="text-orange-400 font-semibold mb-2">
              ✨ {testingMode === 'professional' ? 'Professional Features' : 'Phase 2 Features'} Active
            </div>
            <div className="space-y-1 text-gray-300">
              {testingMode === 'professional' ? (
                <>
                  <div>• Three-layer rendering (tool/hand-bg/hand-fg)</div>
                  <div>• Precise hand-tool alignment</div>
                  <div>• Asset-based composition system</div>
                  <div>• Professional drawing tools</div>
                </>
              ) : (
                <>
                  <div>• Natural movement smoothing</div>
                  <div>• Automatic corner lifting</div>
                  <div>• Human-like jitter and spring motion</div>
                  <div>• Configurable tip anchor positioning</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Usage Instructions - Only show for simple and professional modes */}
      {testingMode !== 'demo' && (
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="text-blue-400 font-semibold mb-2">💡 How to Test</div>
        <div className="text-sm space-y-1 text-gray-300">
          {testingMode === 'simple' ? (
            <>
              <div>1. Upload your hand image above</div>
              <div>2. Set the pen tip position using presets</div>
              <div>3. Click "Create Simple Test" to generate animation</div>
              <div>4. Use the timeline to play and see the hand follow the path</div>
            </>
          ) : (
            <>
              <div>1. Choose your drawing style (or use auto-suggest)</div>
              <div>2. Select hand asset from predefined options</div>
              <div>3. Pick compatible tool (pen, brush, marker, etc.)</div>
              <div>4. Adjust hand scale to match your canvas</div>
              <div>5. Create professional three-layer animation</div>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default HandTesting;
