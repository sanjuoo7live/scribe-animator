import React from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/appStore';

interface CanvasSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const CanvasSettings: React.FC<CanvasSettingsProps> = ({ isOpen, onClose }) => {
  const { currentProject, updateProject } = useAppStore();
  // Draggable panel state (stable, pointer-relative)
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const posRef = React.useRef<{ top: number; left: number }>({ top: 56, left: 0 });
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingRef = React.useRef(false);

  // Set initial position when opened (top-right by default)
  React.useLayoutEffect(() => {
    if (!isOpen) return;
    // place at top-right with 24px margin
    const w = panelRef.current?.offsetWidth || 560;
    const left = Math.max(0, (window.innerWidth - w) - 24);
    const top = 56; // matches toolbar spacing
    posRef.current = { top, left };
    setPos({ top, left });
  }, [isOpen]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    e.preventDefault();
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    // Ensure we start from actual on-screen coordinates
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      posRef.current = { top: rect.top, left: rect.left };
      setPos({ top: rect.top, left: rect.left });
    }
    // UX: indicate dragging & avoid accidental text selection
    document.body.style.cursor = 'grabbing';
    (document.body.style as any).userSelect = 'none';
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const next = { top: posRef.current.top + dy, left: posRef.current.left + dx };
    // Clamp to viewport
    const w = panelRef.current?.offsetWidth || 0;
    const h = panelRef.current?.offsetHeight || 0;
    const maxLeft = Math.max(0, window.innerWidth - w);
    const maxTop = Math.max(0, window.innerHeight - h);
    const clamped = { top: Math.min(Math.max(0, next.top), maxTop), left: Math.min(Math.max(0, next.left), maxLeft) };
    setPos(clamped);
  };

  const handleDragEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (pos) posRef.current = { ...pos };
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = '';
    (document.body.style as any).userSelect = '';
  };

  // Cleanup listeners on unmount just in case
  React.useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Close on Esc (only when open). Use capture to ensure we get the event first.
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        try { e.preventDefault(); } catch {}
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('keyup', onKey, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true } as any);
      window.removeEventListener('keyup', onKey, { capture: true } as any);
    };
  }, [isOpen, onClose]);

  // Debug: mount lifecycle
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[CanvasSettings] useEffect mount');
    return () => {
      // eslint-disable-next-line no-console
      console.log('[CanvasSettings] useEffect unmount');
    };
  }, []);

  if (!isOpen) return null;

  const boardStyles = [
    { id: 'whiteboard', name: 'Whiteboard', color: '#ffffff', texture: 'none' },
    { id: 'chalkboard-dark', name: 'Chalkboard (Dark)', color: '#2d3748', texture: 'chalk' },
    { id: 'chalkboard-green', name: 'Chalkboard (Green)', color: '#2f855a', texture: 'chalk' },
    { id: 'glassboard', name: 'Glassboard', color: '#f7fafc', texture: 'glass' },
    { id: 'custom', name: 'Custom Color', color: '#e2e8f0', texture: 'none' }
  ];

  const canvasPresets = [
    { name: 'YouTube (16:9)', width: 1920, height: 1080 },
    { name: 'Square (1:1)', width: 1080, height: 1080 },
    { name: 'Vertical (9:16)', width: 1080, height: 1920 },
    { name: 'Widescreen (21:9)', width: 2560, height: 1080 },
    { name: 'HD (4:3)', width: 1440, height: 1080 }
  ];

  const projWidth = currentProject?.width ?? 800;
  const projHeight = currentProject?.height ?? 600;
  const projBoardStyle = currentProject?.boardStyle ?? 'whiteboard';
  const projBg = currentProject?.backgroundColor ?? '#ffffff';

  const updateCanvasSize = (width: number, height: number) => {
    updateProject({ width, height });
  };

  const updateBoardStyle = (styleId: string, color?: string) => {
    updateProject({ 
      boardStyle: styleId,
      backgroundColor: color 
    });
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  // Debug: render trace
  // eslint-disable-next-line no-console
  console.log('[CanvasSettings] render isOpen=', isOpen);

  const panel = (
    <div
      className="fixed inset-0 z-[99999] pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 99999
      }}
    >
      {/* Floating panel anchored to the right; doesn't block canvas interactions */}
      <div
        className="absolute top-14 right-6 bg-gray-800/98 text-white rounded-xl border border-gray-700 shadow-2xl ring-1 ring-white/10 p-6 w-[560px] max-w-[95vw] max-h-[80vh] overflow-y-auto pointer-events-auto backdrop-blur-sm"
        style={{
          position: 'fixed',
          top: pos?.top ?? 56,
          left: pos?.left ?? Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 560 - 24),
          width: 560,
          maxWidth: '95vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          pointerEvents: 'auto',
          background: 'rgba(31,41,55,0.98)', // gray-800/98 fallback
          color: '#fff',
          borderRadius: 12,
          border: '1px solid #374151',
          boxShadow: '0 20px 80px rgba(0,0,0,0.5)',
          padding: 24
        }}
        ref={panelRef}
      >
        <div
          className="flex justify-between items-center mb-8 cursor-move select-none"
          onMouseDown={handleDragStart}
        >
          <h2 className="text-2xl font-bold text-white">Canvas Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            ×
          </button>
        </div>

        {/* Canvas Size */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-600 pb-2">Canvas Size</h3>
    <div className="grid grid-cols-1 gap-3 mb-5">
            {canvasPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => updateCanvasSize(preset.width, preset.height)}
                className={`p-4 text-left rounded-xl border transition-all ${
      projWidth === preset.width && projHeight === preset.height
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                    : 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold text-base mb-0.5">{preset.name}</div>
                <div className="text-sm opacity-80">{preset.width} × {preset.height} pixels</div>
              </button>
            ))}
          </div>
          
          {/* Custom Size */}
          <div className="border-t border-gray-600 pt-5">
            <div className="text-lg font-semibold text-gray-200 mb-3">Custom Size</div>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Width</label>
                <input
                  type="number"
                  placeholder="Width"
                  value={projWidth}
                  onChange={(e) => updateCanvasSize(Number(e.target.value), projHeight)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <span className="flex items-center text-gray-400 text-xl font-bold mt-6">×</span>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Height</label>
                <input
                  type="number"
                  placeholder="Height"
                  value={projHeight}
                  onChange={(e) => updateCanvasSize(projWidth, Number(e.target.value))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Board Style */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-600 pb-2">Board Style</h3>
    <div className="space-y-3">
            {boardStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => updateBoardStyle(style.id, style.color)}
                className={`p-4 rounded-xl border flex items-center gap-4 transition-all w-full ${
      projBoardStyle === style.id
                    ? 'border-blue-500 bg-blue-600 shadow-lg'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600'
                }`}
              >
                <div
                  className="w-14 h-14 rounded-xl border border-gray-500 shadow-inner"
                  style={{ backgroundColor: style.color }}
                />
                <div className="text-left">
                  <div className="font-semibold text-base text-white mb-0.5">{style.name}</div>
                  {style.texture !== 'none' && (
                    <div className="text-sm text-gray-300">with {style.texture} texture</div>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {/* Custom Color Picker */}
    {projBoardStyle === 'custom' && (
            <div className="mt-5 pt-5 border-t border-gray-600">
              <label className="block text-lg font-semibold text-gray-200 mb-3">Custom Background Color</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
      value={projBg}
                  onChange={(e) => updateProject({ backgroundColor: e.target.value })}
                  className="w-16 h-12 rounded-lg border border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
      value={projBg}
                  onChange={(e) => updateProject({ backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>

  {/* Footer removed: settings apply instantly; use the × button or Esc to close */}
      </div>
    </div>
  );

  if (!portalTarget) return panel;
  return createPortal(panel, portalTarget);
};

export default CanvasSettings;
