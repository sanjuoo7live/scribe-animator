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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Text Properties</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

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
    </div>
  );
};

export default TextPropertiesModal;
