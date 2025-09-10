import React, { useEffect, useMemo, useRef, useState } from 'react';
import AssetLibraryPopup from '../panels/AssetLibraryPopup';
import { HandAsset, ToolAsset } from '../../types/handAssets';
import { HandPreset, ToolPreset } from '../../types/handPresets';
import { HandPresetManager } from '../../utils/handPresetManager';
import { HandToolCompositor } from '../../utils/handToolCompositor';
import { ToolPresetManager } from '../../utils/toolPresetManager';

interface Props {
  open: boolean;
  initialHand?: HandAsset | null;
  initialTool?: ToolAsset | null;
  initialScale?: number;
  onApply: (sel: { hand: HandAsset | null; tool: ToolAsset | null; scale: number; mirror: boolean }) => void;
  onClose: () => void;
}

export const HandToolSelector: React.FC<Props> = ({ open, initialHand, initialTool, initialScale = 0.35, onApply, onClose }) => {
  // Preset-driven state
  const [presets, setPresets] = useState<HandPreset[]>([]);
  const [tools, setTools] = useState<ToolPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterHanded, setFilterHanded] = useState<'all' | 'left' | 'right'>('all');
  const [filterStyle, setFilterStyle] = useState<'all' | 'photoreal' | 'cartoon' | 'sketch'>('all');
  const [filterTone, setFilterTone] = useState<'all' | 'light' | 'medium' | 'dark'>('all');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [scale] = useState<number>(initialScale); // Scale is controlled in Properties Panel

  // Derived selected preset and legacy assets
  const selectedPreset = useMemo(() => presets.find(p => p.id === selectedPresetId) || null, [presets, selectedPresetId]);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const selectedLegacy = useMemo(() => {
    if (!selectedPreset) return { hand: null as HandAsset | null, tool: null as ToolAsset | null };
    const hand = HandPresetManager.presetToLegacyHandAsset(selectedPreset);
    let tool: ToolAsset | null = null;
    if (selectedToolId) {
      const t = tools.find(t => t.id === selectedToolId);
      if (t) tool = ToolPresetManager.presetToLegacyToolAsset(t);
    }
    if (!tool) tool = HandPresetManager.presetToLegacyToolAsset(selectedPreset);
    return { hand, tool };
  }, [selectedPreset, selectedToolId, tools]);

  // Preview canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<{ bg?: HTMLImageElement; fg?: HTMLImageElement; tool?: HTMLImageElement }>({});

  // Load presets from manifest
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const loadAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const entries = await HandPresetManager.getAvailablePresets();
        const loaded: HandPreset[] = [];
        for (const e of entries) {
          const p = await HandPresetManager.loadPreset(e.id);
          if (p) loaded.push(p);
        }
        if (!mounted) return;
        setPresets(loaded);
        // Initial selection: preserve prior if compatible, else first
        const initialId = loaded.find(p => p.id === initialHand?.id)?.id || loaded[0]?.id || null;
        setSelectedPresetId(initialId);

        // Load optional tool presets
        const toolEntries = await ToolPresetManager.getAvailablePresets();
        if (toolEntries.length) {
          const loadedTools: ToolPreset[] = [];
          for (const te of toolEntries) {
            const tp = await ToolPresetManager.loadPreset(te.id);
            if (tp) loadedTools.push(tp);
          }
          if (!mounted) return;
          setTools(loadedTools);
          if (initialTool) setSelectedToolId(initialTool.id);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load hand presets');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAll();
    return () => { mounted = false; };
  }, [open, initialHand?.id]);

  // Load hand images when preset changes
  useEffect(() => {
    if (!selectedPreset) return;
    const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    const bgSrc = HandPresetManager.getAssetPath(selectedPreset, 'bg');
    const fgSrc = HandPresetManager.getAssetPath(selectedPreset, 'fg');
    Promise.all([loadImg(bgSrc), loadImg(fgSrc)])
      .then(([bg, fg]) => setImages(prev => ({ ...prev, bg, fg })))
      .catch(() => setImages({}));
  }, [selectedPreset]);

  // Load tool image independently (or fallback to hand-bound tool)
  useEffect(() => {
    let src = '';
    if (selectedToolId) {
      const t = tools.find(t => t.id === selectedToolId);
      if (t) src = ToolPresetManager.getAssetPath(t, 'image');
    }
    if (!src && selectedPreset) {
      src = HandPresetManager.getAssetPath(selectedPreset, 'tool');
    }
    if (!src) return;
    const img = new Image();
    img.onload = () => setImages(prev => ({ ...prev, tool: img }));
    img.onerror = () => setImages(prev => ({ ...prev, tool: undefined }));
    img.src = src;
  }, [selectedToolId, tools, selectedPreset]);

  // Draw composite preview
  useEffect(() => {
    if (!canvasRef.current || !selectedPreset || !images.bg || !images.fg || !images.tool) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and backdrop
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#F5E6D3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert preset to legacy assets for transform math
    const handAsset = HandPresetManager.presetToLegacyHandAsset(selectedPreset);
    // Build tool asset from independent tool if selected; otherwise from hand preset
    let toolAsset: ToolAsset | null = null;
    if (selectedToolId) {
      const t = tools.find(t => t.id === selectedToolId);
      if (t) toolAsset = ToolPresetManager.presetToLegacyToolAsset(t);
    }
    if (!toolAsset) toolAsset = HandPresetManager.presetToLegacyToolAsset(selectedPreset);

    // Compute a preview scale that fits nicely
    const margin = 40;
    const fitScale = Math.min(
      (canvas.width - margin) / selectedPreset.dimensions.width,
      (canvas.height - margin) / selectedPreset.dimensions.height
    );
    const s = Math.max(0.1, Math.min(1.5, fitScale));

    const target = { x: canvas.width * 0.55, y: canvas.height * 0.6 };
    const comp = HandToolCompositor.composeHandTool(
      handAsset,
      toolAsset,
      target,
      0,
      s
    );

    // Helper to draw an image with the given transform (top-left origin)
    const drawTransformed = (
      img: HTMLImageElement,
      pos: { x: number; y: number },
      rot: number,
      scale: number
    ) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    };

    // Draw BG → TOOL → FG per z-order
    drawTransformed(images.bg, comp.handPosition, comp.handRotation, comp.handScale);
    drawTransformed(images.tool, comp.toolPosition, comp.toolRotation, comp.toolScale);
    drawTransformed(images.fg, comp.handPosition, comp.handRotation, comp.handScale);

    // Crosshair at tip
    const tip = comp.finalTipPosition;
    ctx.save();
    ctx.strokeStyle = '#D14D4D';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tip.x - 6, tip.y);
    ctx.lineTo(tip.x + 6, tip.y);
    ctx.moveTo(tip.x, tip.y - 6);
    ctx.lineTo(tip.x, tip.y + 6);
    ctx.stroke();
    ctx.restore();
  }, [selectedPreset, images.bg, images.fg, images.tool, selectedToolId, tools]);

  // Filtered list
  const filteredPresets = useMemo(() => {
    return presets.filter(p =>
      (filterHanded === 'all' || p.handedness === filterHanded) &&
      (filterStyle === 'all' || p.style === filterStyle) &&
      (filterTone === 'all' || p.skinTone === filterTone)
    );
  }, [presets, filterHanded, filterStyle, filterTone]);

  if (!open) return null;

  return (
    <AssetLibraryPopup
      isOpen={open}
      onClose={onClose}
      title="Hand & Tool Selector"
      initialWidth={1100}
      initialHeight={700}
      minWidth={900}
      minHeight={520}
      footerText="Select hand and tool • Drag header to move • Press ESC to close"
    >
      <div className="h-full flex flex-col">
        {/* Content area */}
        <div className="flex-1 grid grid-cols-3 gap-6 p-4 overflow-auto">
          {/* Library + Filters */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-200 font-semibold">Hand Library</h3>
              <div className="flex gap-2 text-xs">
                <select className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
                        value={filterHanded} onChange={e=>setFilterHanded(e.target.value as any)}>
                  <option value="all">Handedness: All</option>
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                </select>
                <select className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
                        value={filterStyle} onChange={e=>setFilterStyle(e.target.value as any)}>
                  <option value="all">Style: All</option>
                  <option value="photoreal">Photo</option>
                  <option value="cartoon">Cartoon</option>
                  <option value="sketch">Sketch</option>
                </select>
                <select className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
                        value={filterTone} onChange={e=>setFilterTone(e.target.value as any)}>
                  <option value="all">Tone: All</option>
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            {/* Presets grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {loading && <div className="text-gray-400 text-sm">Loading presets…</div>}
              {error && <div className="text-red-400 text-sm">{error}</div>}
              {!loading && !error && filteredPresets.map(p => (
                <button key={p.id}
                        onClick={() => setSelectedPresetId(p.id)}
                        className={`text-left bg-gray-800 border rounded p-2 hover:bg-gray-700 ${selectedPresetId===p.id?'border-blue-500':'border-gray-700'}`}>
                  <div className="aspect-square w-full bg-gray-900 rounded mb-2 overflow-hidden flex items-center justify-center">
                    <img
                      src={HandPresetManager.getAssetPath(p, 'thumbnail')}
                      alt={p.title}
                      className="object-cover w-full h-full"
                      onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; }}
                    />
                  </div>
                  <div className="text-sm text-gray-200 truncate">{p.title}</div>
                  <div className="text-[11px] text-gray-400">{p.style} • {p.handedness}</div>
                </button>
              ))}
            </div>

            {/* Tools section */}
            <div className="mt-6">
              <h4 className="text-gray-200 font-semibold mb-2">Tool Options</h4>
              {tools.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {tools.map(t => (
                    <button key={t.id}
                            onClick={() => setSelectedToolId(t.id)}
                            className={`text-left bg-gray-800 border rounded p-2 hover:bg-gray-700 ${selectedToolId===t.id?'border-green-500':'border-gray-700'}`}>
                      <div className="aspect-square w-full bg-gray-900 rounded mb-2 overflow-hidden flex items-center justify-center">
                        <img
                          src={ToolPresetManager.getAssetPath(t, 'thumbnail')}
                          alt={t.title}
                          className="object-cover w-full h-full"
                          onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; }}
                        />
                      </div>
                      <div className="text-sm text-gray-200 capitalize">{t.type}</div>
                      <div className="text-[11px] text-gray-400 truncate">{t.title}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {selectedPreset && (
                    <div className="bg-gray-800 border border-blue-500 rounded p-3">
                      <div className="aspect-square w-full bg-gray-900 rounded mb-2 overflow-hidden flex items-center justify-center">
                        <img
                          src={HandPresetManager.getAssetPath(selectedPreset, 'tool')}
                          alt={selectedPreset.tool.type}
                          className="object-contain w-full h-full"
                        />
                      </div>
                      <div className="text-sm text-gray-200 capitalize">{selectedPreset.tool.type}</div>
                      <div className="text-[11px] text-gray-400">Preset’s tool (no tool library)</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-gray-200 font-semibold mb-3">Preview</h3>
            <div className="bg-gray-800 border border-gray-700 rounded p-3">
              <canvas ref={canvasRef} width={420} height={420} className="w-full h-[420px] bg-[#F5E6D3] rounded" />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 px-3 py-2 bg-gray-700 rounded text-sm"
                onClick={() => alert('Calibration opens from Properties Panel for now.')}
              >
                Calibrate…
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 bg-gray-700 rounded">Cancel</button>
          <button
            type="button"
            className="px-3 py-1 bg-blue-600 rounded disabled:opacity-50"
            onClick={() => {
              if (!selectedLegacy.hand || !selectedLegacy.tool) return;
              onApply({ hand: selectedLegacy.hand, tool: selectedLegacy.tool, scale, mirror: false });
            }}
            disabled={!selectedLegacy.hand || !selectedLegacy.tool}
          >Apply Selection</button>
        </div>
      </div>
    </AssetLibraryPopup>
  );
};

export default HandToolSelector;
