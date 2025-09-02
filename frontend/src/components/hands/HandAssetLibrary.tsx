/**
 * Hand Asset Library Component
 * 
 * Displays available hand assets and allows selection, upload, and management
 * of custom hand assets for the Hand Follower System.
 */

import React, { useState, useEffect } from 'react';
import { HandAsset, HandAssetManager } from './HandAssetManager';
import { HandAssetUpload } from './HandAssetUpload';

interface HandAssetLibraryProps {
  selectedAsset?: HandAsset | null;
  onAssetSelect: (asset: HandAsset | null) => void;
  onClose: () => void;
}

export const HandAssetLibrary: React.FC<HandAssetLibraryProps> = ({
  selectedAsset,
  onAssetSelect,
  onClose
}) => {
  const [assets, setAssets] = useState<HandAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<HandAsset[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'hand' | 'tool' | 'custom'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  // Load assets on mount
  useEffect(() => {
    const allAssets = HandAssetManager.getAvailableHands();
    setAssets(allAssets);
  }, []);

  // Filter assets based on category and search
  useEffect(() => {
    let filtered = assets;

    // Category filter
    if (categoryFilter === 'custom') {
      filtered = filtered.filter(asset => asset.isCustom);
    } else if (categoryFilter !== 'all') {
      filtered = filtered.filter(asset => asset.category === categoryFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssets(filtered);
  }, [assets, categoryFilter, searchTerm]);

  const handleAssetUpload = (newAsset: HandAsset) => {
    setAssets(prev => [...prev, newAsset]);
    setShowUpload(false);
  };

  const handleAssetDelete = async (asset: HandAsset) => {
    if (!asset.isCustom) return;

    // eslint-disable-next-line no-restricted-globals
    if (confirm(`Delete "${asset.name}"? This cannot be undone.`)) {
      const success = HandAssetManager.removeCustomAsset(asset.id);
      if (success) {
        setAssets(prev => prev.filter(a => a.id !== asset.id));
        if (selectedAsset?.id === asset.id) {
          onAssetSelect(null);
        }
      }
    }
  };

  const AssetCard: React.FC<{ asset: HandAsset }> = ({ asset }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    return (
      <div
        className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all ${
          selectedAsset?.id === asset.id 
            ? 'border-blue-500 bg-blue-900/20' 
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onClick={() => onAssetSelect(asset)}
      >
        {/* Asset Preview */}
        <div className="relative w-full h-24 bg-gray-700 rounded mb-2 flex items-center justify-center">
          {!imageError && (
            <img
              src={asset.imagePath}
              alt={asset.name}
              className={`max-w-full max-h-full object-contain transition-opacity ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
          {imageError && (
            <div className="text-gray-500 text-sm">❌ Failed to load</div>
          )}
          {!imageLoaded && !imageError && (
            <div className="text-gray-500 text-sm">Loading...</div>
          )}
          
          {/* Tip anchor indicator */}
          {imageLoaded && !imageError && (
            <div
              className="absolute w-2 h-2 bg-red-500 rounded-full border border-white"
              style={{
                left: `${asset.tipAnchor.x * 100}%`,
                top: `${asset.tipAnchor.y * 100}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          )}
        </div>

        {/* Asset Info */}
        <div className="space-y-1">
          <div className="text-sm font-medium text-white truncate" title={asset.name}>
            {asset.name}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className={`px-1 py-0.5 rounded ${
              asset.category === 'hand' ? 'bg-green-800' : 'bg-blue-800'
            }`}>
              {asset.category}
            </span>
            <span>{asset.imageType.toUpperCase()}</span>
          </div>
          {asset.isCustom && (
            <div className="text-xs text-yellow-400">Custom</div>
          )}
        </div>

        {/* Delete button for custom assets */}
        {asset.isCustom && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAssetDelete(asset);
            }}
            className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full text-xs hover:bg-red-700 flex items-center justify-center"
            title="Delete custom asset"
          >
            ✕
          </button>
        )}

        {/* Selected indicator */}
        {selectedAsset?.id === asset.id && (
          <div className="absolute top-1 left-1 w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
            ✓
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-screen flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Hand Asset Library</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-700 space-y-3">
          <div className="flex gap-4 items-center">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="p-2 bg-gray-700 text-white rounded border border-gray-600 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="hand">Hands</option>
              <option value="tool">Tools</option>
              <option value="custom">Custom</option>
            </select>

            {/* Upload Button */}
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Upload Custom
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onAssetSelect(null)}
              className={`px-3 py-1 rounded text-sm ${
                !selectedAsset ? 'bg-gray-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              No Hand
            </button>
            <div className="text-sm text-gray-400 flex items-center">
              {filteredAssets.length} asset(s) found
            </div>
          </div>
        </div>

        {/* Asset Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredAssets.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🖐️</div>
              <p>No assets found matching your criteria.</p>
              {categoryFilter === 'custom' && (
                <p className="text-sm mt-2">Upload your first custom hand asset!</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredAssets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {selectedAsset ? `Selected: ${selectedAsset.name}` : 'No asset selected'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <HandAssetUpload
          onAssetUploaded={handleAssetUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
};
