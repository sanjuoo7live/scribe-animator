import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface AssetLibraryProps {
  category: 'shapes' | 'hands' | 'characters' | 'props';
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({ category }) => {
  const { addObject, currentProject, currentTime } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Built-in asset libraries
  const assetLibraries = useMemo(() => ({
    shapes: [
      { id: 'rectangle', name: 'Rectangle', icon: '⬜', type: 'shape' },
      { id: 'circle', name: 'Circle', icon: '⭕', type: 'shape' },
      { id: 'triangle', name: 'Triangle', icon: '🔺', type: 'shape' },
      { id: 'star', name: 'Star', icon: '⭐', type: 'shape' },
      { id: 'heart', name: 'Heart', icon: '❤️', type: 'shape' },
      { id: 'arrow', name: 'Arrow', icon: '➡️', type: 'shape' },
      { id: 'line', name: 'Line', icon: '📏', type: 'shape' },
      { id: 'polygon', name: 'Polygon', icon: '🔷', type: 'shape' },
      { id: 'diamond', name: 'Diamond', icon: '💎', type: 'shape' },
      { id: 'hexagon', name: 'Hexagon', icon: '⬡', type: 'shape' },
      { id: 'oval', name: 'Oval', icon: '⭕', type: 'shape' },
      { id: 'square', name: 'Square', icon: '⬛', type: 'shape' }
    ],
    hands: [
      { id: 'hand-right-white', name: 'Right Hand (Light)', icon: '👉🏻', type: 'hand' },
      { id: 'hand-right-medium', name: 'Right Hand (Medium)', icon: '👉🏽', type: 'hand' },
      { id: 'hand-right-dark', name: 'Right Hand (Dark)', icon: '👉🏿', type: 'hand' },
      { id: 'hand-left-white', name: 'Left Hand (Light)', icon: '👈🏻', type: 'hand' },
      { id: 'hand-left-medium', name: 'Left Hand (Medium)', icon: '👈🏽', type: 'hand' },
      { id: 'hand-left-dark', name: 'Left Hand (Dark)', icon: '👈🏿', type: 'hand' },
      { id: 'hand-pointing-white', name: 'Pointing (Light)', icon: '☝🏻', type: 'hand' },
      { id: 'hand-pointing-medium', name: 'Pointing (Medium)', icon: '☝🏽', type: 'hand' },
      { id: 'hand-pointing-dark', name: 'Pointing (Dark)', icon: '☝🏿', type: 'hand' },
      { id: 'thumbs-up', name: 'Thumbs Up', icon: '👍', type: 'hand' },
      { id: 'thumbs-down', name: 'Thumbs Down', icon: '👎', type: 'hand' },
      { id: 'ok-hand', name: 'OK Hand', icon: '👌', type: 'hand' },
      { id: 'peace-sign', name: 'Peace Sign', icon: '✌️', type: 'hand' },
      { id: 'clapping', name: 'Clapping', icon: '👏', type: 'hand' },
      { id: 'waving', name: 'Waving', icon: '👋', type: 'hand' }
    ],
    characters: [
      { id: 'person-standing', name: 'Person Standing', icon: '🧍', type: 'character' },
      { id: 'person-walking', name: 'Person Walking', icon: '🚶', type: 'character' },
      { id: 'person-running', name: 'Person Running', icon: '🏃', type: 'character' },
      { id: 'person-sitting', name: 'Person Sitting', icon: '🪑', type: 'character' },
      { id: 'person-working', name: 'Person Working', icon: '💼', type: 'character' },
      { id: 'person-thinking', name: 'Person Thinking', icon: '🤔', type: 'character' },
      { id: 'businessman', name: 'Businessman', icon: '👨‍💼', type: 'character' },
      { id: 'businesswoman', name: 'Businesswoman', icon: '👩‍💼', type: 'character' },
      { id: 'teacher', name: 'Teacher', icon: '👨‍🏫', type: 'character' },
      { id: 'student', name: 'Student', icon: '👨‍🎓', type: 'character' },
      { id: 'doctor', name: 'Doctor', icon: '👨‍⚕️', type: 'character' },
      { id: 'scientist', name: 'Scientist', icon: '👨‍🔬', type: 'character' }
    ],
    props: [
      { id: 'laptop', name: 'Laptop', icon: '💻', type: 'prop' },
      { id: 'phone', name: 'Phone', icon: '📱', type: 'prop' },
      { id: 'book', name: 'Book', icon: '📚', type: 'prop' },
      { id: 'lightbulb', name: 'Light Bulb', icon: '💡', type: 'prop' },
      { id: 'target', name: 'Target', icon: '🎯', type: 'prop' },
      { id: 'chart', name: 'Chart', icon: '📊', type: 'prop' },
      { id: 'clock', name: 'Clock', icon: '⏰', type: 'prop' },
      { id: 'money', name: 'Money', icon: '💰', type: 'prop' },
      { id: 'trophy', name: 'Trophy', icon: '🏆', type: 'prop' },
      { id: 'medal', name: 'Medal', icon: '🏅', type: 'prop' },
      { id: 'key', name: 'Key', icon: '🔑', type: 'prop' },
      { id: 'lock', name: 'Lock', icon: '🔒', type: 'prop' },
      { id: 'camera', name: 'Camera', icon: '📷', type: 'prop' },
      { id: 'microphone', name: 'Microphone', icon: '🎤', type: 'prop' },
      { id: 'speaker', name: 'Speaker', icon: '🔊', type: 'prop' },
      { id: 'calendar', name: 'Calendar', icon: '📅', type: 'prop' }
    ]
  }), []);

  const addAssetToCanvas = (asset: any) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const newObject = {
      id: `${asset.id}-${Date.now()}`,
      type: asset.type === 'shape' ? 'shape' as const : 'image' as const,
      x: 100, // Fixed position instead of random
      y: 100,
      width: asset.type === 'shape' ? 100 : 80, // Slightly smaller for emojis
      height: asset.type === 'shape' ? 100 : 80,
      properties: {
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type,
        ...(asset.type === 'shape' ? {
          shapeType: asset.id,
          fill: 'transparent',
          stroke: '#000000',
          strokeWidth: 2
        } : {
          src: asset.icon,
          alt: asset.name
        })
      },
      animationStart: currentTime, // Start at current timeline position
      animationDuration: 5,
      animationType: 'fadeIn' as const,
      animationEasing: 'easeOut' as const
    };

    addObject(newObject);
    
    console.log('Added object to project:', newObject.id, 'Total objects:', currentProject.objects.length + 1);
    
    // Success feedback
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = `Added ${asset.name} to canvas`;
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 2000);
  };

  const assets = useMemo(() => assetLibraries[category] || [], [category, assetLibraries]);

  // Filter assets based on search term
  const filteredAssets = useMemo(() => {
    if (!searchTerm.trim()) return assets;
    return assets.filter(asset =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assets, searchTerm]);

  return (
    <div className="h-full">
      <h4 className="text-lg font-bold text-white mb-3 capitalize">{category}</h4>
      
      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={`Search ${category}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-gray-800 text-white rounded-lg text-sm placeholder-gray-400 border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
        {filteredAssets.length === 0 ? (
          <div className="col-span-2 text-center text-gray-400 py-8">
            {searchTerm ? (
              <div>
                <div className="text-3xl mb-2">🔍</div>
                <div className="text-sm font-medium text-white">No {category} found</div>
                <div className="text-xs text-gray-400">Try a different search term</div>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">📦</div>
                <div className="text-sm font-medium text-white">No {category} available</div>
              </div>
            )}
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => addAssetToCanvas(asset)}
              className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all group hover:scale-105 hover:shadow-lg border border-gray-600 hover:border-blue-500"
              title={asset.name}
            >
              <div className="text-3xl mb-2">{asset.icon}</div>
              <div className="text-xs text-gray-300 group-hover:text-white font-medium">
                {asset.name}
              </div>
            </button>
          ))
        )}
      </div>
      
      {/* Asset Count */}
      <div className="mt-4 pt-3 border-t border-gray-600">
        <div className="text-xs text-gray-400 font-medium">
          {filteredAssets.length} of {assets.length} {category}
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>
    </div>
  );
};

export default AssetLibrary;
