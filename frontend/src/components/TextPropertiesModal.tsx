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
  const [size, setSize] = React.useState<{ width: number; height: number }>({ width: 400, height: 600 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = React.useState({ x: 0, y: 0, width: 0, height: 0 });

  // Set initial position when opened (centered by default)
  React.useLayoutEffect(() => {
    if (!isOpen) return;
    // Center the modal on screen
    const w = size.width;
    const h = size.height;
    const left = Math.max(0, (window.innerWidth - w) / 2);
    const top = Math.max(0, (window.innerHeight - h) / 2);
    setPos({ top, left });
  }, [isOpen, size.width, size.height]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (pos?.left ?? 100),
      y: e.clientY - (pos?.top ?? 100)
    });
    document.body.style.cursor = 'grabbing';
    (document.body.style as any).userSelect = 'none';
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
    document.body.style.cursor = 'nw-resize';
    (document.body.style as any).userSelect = 'none';
  };

  // Handle mouse events
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.y));
        setPos({ top: newY, left: newX });
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(320, Math.min(window.innerWidth - (pos?.left ?? 0) - 20, resizeStart.width + deltaX));
        const newHeight = Math.max(400, Math.min(window.innerHeight - (pos?.top ?? 0) - 20, resizeStart.height + deltaY));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      document.body.style.cursor = '';
      (document.body.style as any).userSelect = '';
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, size, pos]);

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
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden pointer-events-auto"
        style={{
          position: 'fixed',
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
