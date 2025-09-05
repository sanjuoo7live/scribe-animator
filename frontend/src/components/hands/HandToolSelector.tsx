import React, { useMemo, useState } from 'react';
import AssetLibraryPopup from '../panels/AssetLibraryPopup';
import { HAND_ASSETS, TOOL_ASSETS, HandAsset, ToolAsset } from '../../types/handAssets';

interface Props {
  open: boolean;
  initialHand?: HandAsset | null;
  initialTool?: ToolAsset | null;
  initialScale?: number;
  onApply: (sel: { hand: HandAsset | null; tool: ToolAsset | null; scale: number; mirror: boolean; showForeground: boolean }) => void;
  onClose: () => void;
}

export const HandToolSelector: React.FC<Props> = ({ open, initialHand, initialTool, initialScale = 0.35, onApply, onClose }) => {
  const [hand, setHand] = useState<HandAsset | null>(initialHand || null);
  const [tool, setTool] = useState<ToolAsset | null>(initialTool || null);
  const [scale, setScale] = useState<number>(initialScale);
  const [mirror, setMirror] = useState(false);
  const [showForeground, setShowForeground] = useState(true); // Re-enabled with proper thumb-only image
  const [loadingPreset, setLoadingPreset] = useState(false);

  const hands = useMemo(() => {
    // Keep original URLs with BACKEND_BASE placeholder for later resolution
    return HAND_ASSETS;
  }, []);
  
  const tools = useMemo(() => {
    // Keep original URLs with BACKEND_BASE placeholder for later resolution
    return TOOL_ASSETS;
  }, []);

  // Resolve asset URLs with working backend base
  const resolveAssetUrls = async (hand: HandAsset, tool: ToolAsset) => {
    const base = await resolveWorkingBase();
    return {
      hand: {
        ...hand,
        imageBg: hand.imageBg.replace('BACKEND_BASE', base),
        imageFg: hand.imageFg.replace('BACKEND_BASE', base)
      },
      tool: {
        ...tool,
        image: tool.image.replace('BACKEND_BASE', base)
      }
    };
  };

  // Auto-select first hand and tool if none selected
  React.useEffect(() => {
    if (!hand && hands.length > 0) {
      setHand(hands[0]);
    }
    if (!tool && tools.length > 0) {
      setTool(tools[0]);
    }
  }, [hand, tool, hands, tools]);

  if (!open) return null;

  // Helper to measure image sizes
  const measureImage = (url: string): Promise<{ w: number; h: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
      img.onerror = (e) => reject(e);
      const bust = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      img.src = bust;
    });
  };

  // Use same working-base resolution strategy as HandTesting
  const resolveWorkingBase = async (): Promise<string> => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const candidates = Array.from(new Set([
      (process.env.REACT_APP_API_BASE as string | undefined) || '',
      `${origin.replace(/:\d+$/, '')}:3001`,
      'http://localhost:3001',
      `${origin.replace(/:\d+$/, '')}:3002`, // In case frontend is on 3002
      'http://localhost:3002',
      origin,
    ].filter(Boolean)));

    console.log('Trying backend candidates:', candidates);
    let lastErr: any = null;
    for (const base of candidates) {
      try {
        console.log(`Testing backend base: ${base}`);
        await measureImage(`${base}/api/assets/hand_bg.png`);
        console.log(`✅ Working backend base: ${base}`);
        return base;
      } catch (e) {
        console.log(`❌ Failed backend base: ${base}`, e);
        lastErr = e;
      }
    }
    throw lastErr || new Error('No working backend base for /api/assets');
  };

  const applyDirectDemoPreset = async () => {
    try {
      setLoadingPreset(true);
      const base = await resolveWorkingBase();
      const HAND_BG_URL = `${base}/api/assets/hand_bg.png`;
      const HAND_FG_URL = `${base}/api/assets/hand_fg.png`;
      const TOOL_URL = `${base}/api/assets/tool.png`;

      const [hb, tb] = await Promise.all([measureImage(HAND_BG_URL), measureImage(TOOL_URL)]);

      const demoHand: HandAsset = {
        id: 'demo-hand-right',
        name: 'Demo Right Hand',
        imageBg: HAND_BG_URL,
        imageFg: HAND_FG_URL,
        sizePx: { w: hb.w, h: hb.h },
        gripBase: { x: Math.round(hb.w * 0.46), y: Math.round(hb.h * 0.55) },
        gripForward: { x: Math.round(hb.w * 0.66), y: Math.round(hb.h * 0.56) },
        naturalTiltDeg: -5,
        mirrorable: true,
      };
      const demoTool: ToolAsset = {
        id: 'demo-tool-pen',
        name: 'Demo Pen',
        image: TOOL_URL,
        sizePx: { w: tb.w, h: tb.h },
        socketBase: { x: Math.round(tb.w * 0.62), y: Math.round(tb.h * 0.50) },
        socketForward: { x: Math.round(tb.w * 0.94), y: Math.round(tb.h * 0.50) },
        tipAnchor: { x: Math.round(tb.w * 0.10), y: Math.round(tb.h * 0.66) },
        rotationOffsetDeg: 0,
      };

      // Apply directly, mirroring the Run Direct Demo asset selection
      onApply({ hand: demoHand, tool: demoTool, scale: 0.35, mirror, showForeground });
    } catch (e) {
      console.error('Failed to apply direct demo preset', e);
      alert('Failed to load demo assets from backend. Ensure the backend is running and assets exist under /api/assets');
    } finally {
      setLoadingPreset(false);
    }
  };

  return (
    <AssetLibraryPopup
      isOpen={open}
      onClose={onClose}
      title="Hand & Tool Selector"
      initialWidth={1000}
      initialHeight={700}
      minWidth={700}
      minHeight={400}
      footerText="Select hand and tool combinations • Drag header to move • Press ESC to close"
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* One-click direct demo preset */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={applyDirectDemoPreset}
            disabled={loadingPreset}
            className={`w-full p-2 rounded border text-sm ${loadingPreset ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white'}`}
          >
            ▶ Use Direct Demo Preset (backend images)
          </button>
          <div className="text-xs text-gray-400">
            Loads hand_bg.png, hand_fg.png, and tool.png from your backend /api/assets just like "Run Direct Demo".
          </div>
        </div>

        {/* Hand and Tool Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-300 mb-2">Choose Hand</div>
            <div className="grid grid-cols-2 gap-2">
              {hands.map(h => (
                <button key={h.id} type="button" onClick={() => setHand(h)}
                  className={`border rounded p-2 h-20 bg-gray-700 hover:bg-gray-600 text-xs ${hand?.id===h.id?'border-blue-500':'border-gray-600'}`}>
                  <div className="truncate mb-1 font-medium">{h.name}</div>
                  <div className="text-[10px] text-gray-400">{h.mirrorable? 'mirrorable':''}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-300 mb-2">Choose Tool</div>
            <div className="grid grid-cols-2 gap-2">
              {tools.map(t => (
                <button key={t.id} type="button" onClick={() => setTool(t)}
                  className={`border rounded p-2 h-20 bg-gray-700 hover:bg-gray-600 text-xs ${tool?.id===t.id?'border-blue-500':'border-gray-600'}`}>
                  <div className="truncate mb-1 font-medium">{t.name}</div>
                  <div className="text-[10px] text-gray-400">{Math.round(Math.hypot(t.socketForward.x-t.tipAnchor.x, t.socketForward.y-t.tipAnchor.y))}px</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 bg-gray-800/50 rounded border border-gray-600">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Size</label>
            <input type="range" min={0.05} max={0.8} step={0.01} value={scale} onChange={e=>setScale(parseFloat(e.target.value))} className="w-full" />
            <div className="text-xs text-gray-400 mt-1">{scale.toFixed(2)}x</div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)} />
            <span className="text-sm">Mirror (Left/Right)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showForeground} onChange={e=>setShowForeground(e.target.checked)} />
            <span className="text-sm">Show Foreground Fingers</span>
          </label>
        </div>

        {/* Selection Status */}
        <div className="text-center p-3 bg-gray-800/30 rounded border border-gray-600">
          <div className="text-sm text-gray-300">
            Selected: <span className="text-blue-400">{hand?.name || 'No hand'}</span> + <span className="text-green-400">{tool?.name || 'No tool'}</span>
          </div>
          {(!hand || !tool) && (
            <div className="text-xs text-orange-400 mt-1">Please select both a hand and tool to continue</div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-3 py-1 bg-gray-700 rounded">Cancel</button>
        <button
          type="button"
          className="px-3 py-1 bg-blue-600 rounded disabled:opacity-50"
          onClick={async () => {
            if (!hand || !tool) {
              alert('Please select both a hand and tool');
              return;
            }
            try {
              // Resolve URLs with working backend base
              const { hand: resolvedHand, tool: resolvedTool } = await resolveAssetUrls(hand, tool);
              console.log('Resolved hand asset URLs:', {
                imageBg: resolvedHand.imageBg,
                imageFg: resolvedHand.imageFg,
                toolImage: resolvedTool.image
              });
              onApply({ hand: resolvedHand, tool: resolvedTool, scale, mirror, showForeground });
            } catch (error) {
              console.error('Failed to resolve asset URLs:', error);
              alert('Failed to resolve backend asset URLs. Ensure the backend is running.');
            }
          }}
          disabled={!hand || !tool}
        >Apply Selection</button>
      </div>
    </AssetLibraryPopup>
  );
};

export default HandToolSelector;
