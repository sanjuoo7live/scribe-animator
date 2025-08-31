import React from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store/appStore';

interface TextPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  textObjId: string;
}

const TextPropertiesModal: React.FC<TextPropertiesModalProps> = ({
  isOpen,
  onClose,
  textObjId
}) => {
  const { currentProject, updateObject } = useAppStore();
  const textObj = currentProject?.objects.find(obj => obj.id === textObjId);

  // Draggable panel state (stable, pointer-relative) - Using CanvasSettings pattern
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const posRef = React.useRef<{ top: number; left: number }>({ top: 56, left: 0 });
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingRef = React.useRef(false);

  // Set initial position when opened (centered on screen)
  React.useLayoutEffect(() => {
    if (!isOpen) return;
    // Center the modal on screen
    const w = panelRef.current?.offsetWidth || 400;
    const h = panelRef.current?.offsetHeight || 600;
    const left = Math.max(0, (window.innerWidth - w) / 2);
    const top = Math.max(0, (window.innerHeight - h) / 2);
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
    console.log('[TextPropertiesModal] useEffect mount');
    return () => {
      // eslint-disable-next-line no-console
      console.log('[TextPropertiesModal] useEffect unmount');
    };
  }, []);

  if (!isOpen || !textObj) return null;

  const updateProperty = (path: string, value: any) => {
    const newProperties = { ...textObj.properties };

    if (path.includes('.')) {
      const keys = path.split('.');
      let current = newProperties;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    } else {
      newProperties[path] = value;
    }

    updateObject(textObj.id, { properties: newProperties });
  };

  const fontFamilies = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Helvetica',
    'Georgia',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS',
    'Lucida Console',
    'Palatino Linotype'
  ];

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  // Debug: render trace
  // eslint-disable-next-line no-console
  console.log('[TextPropertiesModal] render isOpen=', isOpen);

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
        className="absolute top-14 right-6 bg-gray-800/98 text-white rounded-xl border border-gray-700 shadow-2xl ring-1 ring-white/10 p-6 w-[400px] max-w-[95vw] max-h-[80vh] overflow-y-auto pointer-events-auto backdrop-blur-sm"
        style={{
          position: 'fixed',
          top: pos?.top ?? 56,
          left: pos?.left ?? Math.max(0, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 400 - 24),
          width: 400,
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
          <h2 className="text-2xl font-bold text-white">Text Properties</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Text Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Text Content
            </label>
            <textarea
              value={textObj?.properties?.text || ''}
              onChange={(e) => updateProperty('text', e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
              rows={3}
              placeholder="Enter your text here..."
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Font Family
            </label>
            <select
              value={textObj?.properties?.fontFamily || 'Arial'}
              onChange={(e) => updateProperty('fontFamily', e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {fontFamilies.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Font Size: {textObj?.properties?.fontSize || 16}px
            </label>
            <input
              type="range"
              min="8"
              max="120"
              value={textObj?.properties?.fontSize || 16}
              onChange={(e) => updateProperty('fontSize', Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>8px</span>
              <span>120px</span>
            </div>
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Text Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={textObj?.properties?.fill || '#000000'}
                onChange={(e) => updateProperty('fill', e.target.value)}
                className="w-12 h-10 rounded border border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={textObj?.properties?.fill || '#000000'}
                onChange={(e) => updateProperty('fill', e.target.value)}
                className="flex-1 p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Font Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Font Style
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateProperty('fontStyle', textObj?.properties?.fontStyle === 'italic' ? 'normal' : 'italic')}
                className={`px-4 py-2 rounded border transition-colors ${
                  textObj?.properties?.fontStyle === 'italic'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                }`}
              >
                <em>Italic</em>
              </button>
              <button
                onClick={() => updateProperty('textDecoration', textObj?.properties?.textDecoration === 'underline' ? 'none' : 'underline')}
                className={`px-4 py-2 rounded border transition-colors ${
                  textObj?.properties?.textDecoration === 'underline'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                }`}
              >
                <u>Underline</u>
              </button>
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Text Alignment
            </label>
            <div className="flex gap-2">
              {['left', 'center', 'right'].map(align => (
                <button
                  key={align}
                  onClick={() => updateProperty('align', align)}
                  className={`px-4 py-2 rounded border transition-colors capitalize ${
                    textObj?.properties?.align === align
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Line Height: {textObj?.properties?.lineHeight || 1.2}
            </label>
            <input
              type="range"
              min="0.8"
              max="3.0"
              step="0.1"
              value={textObj?.properties?.lineHeight || 1.2}
              onChange={(e) => updateProperty('lineHeight', Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.8</span>
              <span>3.0</span>
            </div>
          </div>

          {/* Letter Spacing */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Letter Spacing: {textObj?.properties?.letterSpacing || 0}px
            </label>
            <input
              type="range"
              min="-5"
              max="20"
              value={textObj?.properties?.letterSpacing || 0}
              onChange={(e) => updateProperty('letterSpacing', Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>-5px</span>
              <span>20px</span>
            </div>
          </div>
        </div>

        {/* Footer removed: settings apply instantly; use the × button or Esc to close */}
      </div>
    </div>
  );

  if (!portalTarget) return panel;
  return createPortal(panel, portalTarget);
};

export default TextPropertiesModal;
