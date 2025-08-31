import React from 'react';
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

  // Draggable modal state
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const posRef = React.useRef<{ top: number; left: number }>({ top: 100, left: 100 });
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingRef = React.useRef(false);

  // Resizable modal state
  const [size, setSize] = React.useState<{ width: number; height: number }>({ width: 400, height: 600 });
  const sizeRef = React.useRef<{ width: number; height: number }>({ width: 400, height: 600 });
  const resizeStartRef = React.useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  const resizingRef = React.useRef(false);

  // Set initial position when opened
  React.useLayoutEffect(() => {
    if (!isOpen) return;
    const w = sizeRef.current.width;
    const h = sizeRef.current.height;
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
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      posRef.current = { top: rect.top, left: rect.left };
      setPos({ top: rect.top, left: rect.left });
    }
    document.body.style.cursor = 'grabbing';
    (document.body.style as any).userSelect = 'none';
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = React.useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const next = { top: posRef.current.top + dy, left: posRef.current.left + dx };
    // Clamp to viewport
    const w = sizeRef.current.width;
    const h = sizeRef.current.height;
    const maxLeft = Math.max(0, window.innerWidth - w - 20);
    const maxTop = Math.max(0, window.innerHeight - h - 20);
    const clamped = { 
      top: Math.min(Math.max(0, next.top), maxTop), 
      left: Math.min(Math.max(0, next.left), maxLeft) 
    };
    setPos(clamped);
  }, []);

  const handleDragEnd = React.useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (pos) posRef.current = { ...pos };
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    document.body.style.cursor = '';
    (document.body.style as any).userSelect = '';
  }, [pos, handleDragMove]);

  const handleResizeStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    resizingRef.current = true;
    resizeStartRef.current = { 
      x: e.clientX, 
      y: e.clientY, 
      width: sizeRef.current.width, 
      height: sizeRef.current.height 
    };
    document.body.style.cursor = 'nw-resize';
    (document.body.style as any).userSelect = 'none';
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = React.useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const dx = e.clientX - resizeStartRef.current.x;
    const dy = e.clientY - resizeStartRef.current.y;
    const newWidth = Math.max(320, resizeStartRef.current.width + dx);
    const newHeight = Math.max(400, resizeStartRef.current.height + dy);
    const newSize = { width: newWidth, height: newHeight };
    sizeRef.current = newSize;
    setSize(newSize);
  }, []);

  const handleResizeEnd = React.useCallback(() => {
    if (!resizingRef.current) return;
    resizingRef.current = false;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    (document.body.style as any).userSelect = '';
  }, [handleResizeMove]);

  // Cleanup listeners on unmount
  React.useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd]);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div
        className="absolute bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
        style={{
          top: pos?.top ?? 100,
          left: pos?.left ?? 100,
          width: size.width,
          height: size.height,
          minWidth: 320,
          minHeight: 400,
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
        ref={modalRef}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-between items-center p-4 bg-gray-700 cursor-move select-none border-b border-gray-600"
          onMouseDown={handleDragStart}
        >
          <h2 className="text-xl font-bold text-white">Text Properties</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-600 transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ height: size.height - 80 }}>
          <div className="space-y-6">
          {/* Text Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Text Content
            </label>
            <textarea
              value={textObj.properties.text || ''}
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
              value={textObj.properties.fontFamily || 'Arial'}
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
              Font Size: {textObj.properties.fontSize || 16}px
            </label>
            <input
              type="range"
              min="8"
              max="120"
              value={textObj.properties.fontSize || 16}
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
                value={textObj.properties.fill || '#000000'}
                onChange={(e) => updateProperty('fill', e.target.value)}
                className="w-12 h-10 rounded border border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={textObj.properties.fill || '#000000'}
                onChange={(e) => updateProperty('fill', e.target.value)}
                className="flex-1 p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Font Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Font Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'normal', label: 'Normal' },
                { value: 'bold', label: 'Bold' },
                { value: 'italic', label: 'Italic' }
              ].map(style => (
                <button
                  key={style.value}
                  onClick={() => updateProperty('fontStyle', style.value)}
                  className={`p-2 rounded border text-sm transition-colors ${
                    textObj.properties.fontStyle === style.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={{
                    fontStyle: style.value === 'italic' ? 'italic' : 'normal',
                    fontWeight: style.value === 'bold' ? 'bold' : 'normal'
                  }}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Decoration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Text Decoration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'none', label: 'None' },
                { value: 'underline', label: 'Underline' },
                { value: 'line-through', label: 'Strikethrough' }
              ].map(decoration => (
                <button
                  key={decoration.value}
                  onClick={() => updateProperty('textDecoration', decoration.value)}
                  className={`p-2 rounded border text-sm transition-colors ${
                    textObj.properties.textDecoration === decoration.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={{ textDecoration: decoration.value }}
                >
                  {decoration.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Text Alignment
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'left', label: 'Left', icon: '⬅️' },
                { value: 'center', label: 'Center', icon: '⬌' },
                { value: 'right', label: 'Right', icon: '➡️' }
              ].map(align => (
                <button
                  key={align.value}
                  onClick={() => updateProperty('align', align.value)}
                  className={`p-2 rounded border text-sm transition-colors ${
                    textObj.properties.align === align.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {align.icon} {align.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Line Height: {textObj.properties.lineHeight || 1.2}
            </label>
            <input
              type="range"
              min="0.8"
              max="3.0"
              step="0.1"
              value={textObj.properties.lineHeight || 1.2}
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
              Letter Spacing: {textObj.properties.letterSpacing || 0}px
            </label>
            <input
              type="range"
              min="-5"
              max="20"
              value={textObj.properties.letterSpacing || 0}
              onChange={(e) => updateProperty('letterSpacing', Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>-5px</span>
              <span>20px</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize bg-gray-600 hover:bg-gray-500 border-t border-l border-gray-500"
          onMouseDown={handleResizeStart}
        />
      </div>
    </div>
  );
};

export default TextPropertiesModal;
