import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import DrawPathEditor from './DrawPathEditor';

interface CustomAsset {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  uploadedAt: string;
  category: string;
}

const CustomAssets: React.FC = () => {
  const { addObject, currentProject } = useAppStore();
  const [assets, setAssets] = useState<CustomAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDrawPathEditor, setShowDrawPathEditor] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<CustomAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom assets from backend
  const loadAssets = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (error) {
      console.error('Failed to load custom assets:', error);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    // Convert FileList to Array
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not a valid image file`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 5MB`);
        continue;
      }

      const formData = new FormData();
      formData.append('asset', file);

      try {
        const response = await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const newAsset = await response.json();
          setAssets(prev => [newAsset, ...prev]);
        } else {
          alert(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Error uploading ${file.name}`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Open draw path editor for an asset
  const openDrawPathEditor = (asset: CustomAsset) => {
    setSelectedAsset(asset);
    setShowDrawPathEditor(true);
  };

  const closeDrawPathEditor = () => {
    setShowDrawPathEditor(false);
    setSelectedAsset(null);
  };

  // Add custom asset to canvas
  const addCustomAssetToCanvas = (asset: CustomAsset) => {
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }

    const newObject = {
      id: `custom-${asset.id}-${Date.now()}`,
      type: 'image' as const,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      width: 150,
      height: 150,
      properties: {
        src: `http://localhost:3001${asset.path}`,
        alt: asset.originalName,
        assetId: asset.id,
        assetName: asset.originalName,
        assetType: 'custom'
      },
      animationStart: 0,
      animationDuration: 5,
      animationType: 'none' as const,
      animationEasing: 'easeOut' as const
    };

    addObject(newObject);
  };

  // Delete custom asset
  const deleteAsset = async (asset: CustomAsset) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Delete ${asset.originalName}?`)) return;

    try {
      const response = await fetch(`http://localhost:3001/api/assets/${asset.filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAssets(prev => prev.filter(a => a.id !== asset.id));
      } else {
        alert('Failed to delete asset');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting asset');
    }
  };

  // Filter assets based on search term
  const filteredAssets = assets.filter(asset =>
    asset.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-300">Custom Assets</h4>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search custom assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 bg-gray-700 text-white rounded text-sm"
        />
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {filteredAssets.length === 0 ? (
          <div className="col-span-2 text-center text-gray-400 py-8">
            {assets.length === 0 ? (
              <div>
                <div className="text-2xl mb-2">📂</div>
                <div className="text-sm">No custom assets</div>
                <div className="text-xs">Upload images to get started</div>
              </div>
            ) : (
              <div>
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-sm">No assets found</div>
                <div className="text-xs">Try a different search term</div>
              </div>
            )}
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="relative bg-gray-700 hover:bg-gray-600 rounded-lg p-2 transition-colors group"
            >
              <button
                onClick={() => addCustomAssetToCanvas(asset)}
                className="w-full"
                title={`Add ${asset.originalName} to canvas`}
              >
                <div className="aspect-square bg-gray-600 rounded mb-2 flex items-center justify-center overflow-hidden">
                  <img
                    src={`http://localhost:3001${asset.path}`}
                    alt={asset.originalName}
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="text-xs text-gray-300 group-hover:text-white truncate">
                  {asset.originalName}
                </div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(asset.size)}
                </div>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAsset(asset);
                }}
                className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="Delete asset"
              >
                ×
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawPathEditor(asset);
                }}
                className="absolute top-1 right-7 w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="Create draw path"
              >
                ✏️
              </button>
            </div>
          ))
        )}
      </div>

      {/* Upload Info */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="text-xs text-gray-400">
          <div>Supported: JPG, PNG, GIF, SVG</div>
          <div>Max size: 5MB per file</div>
          <div className="mt-1">Total assets: {assets.length}</div>
        </div>
      </div>

      {/* Draw Path Editor Modal */}
      <DrawPathEditor
        isOpen={showDrawPathEditor}
        onClose={closeDrawPathEditor}
        assetId={selectedAsset?.id}
        assetSrc={selectedAsset ? `http://localhost:3001${selectedAsset.path}` : undefined}
      />
    </div>
  );
};

export default CustomAssets;
