import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import ProDrawEditor from './ProDrawEditor';

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
  const [selectedAsset, setSelectedAsset] = useState<CustomAsset | null>(null);
  const [showProEditor, setShowProEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('customAssets.viewMode');
    return saved === 'list' ? 'list' : 'grid';
  });

  // Dynamic backend URL based on current frontend port
  const getBackendUrl = () => {
    const currentPort = window.location.port;
    const backendPort = currentPort === '3002' ? '3001' : '3001'; // Can be made more dynamic if needed
    return `${window.location.protocol}//${window.location.hostname}:${backendPort}`;
  };

  // Local name map to persist renames client-side
  const getNameMap = (): Record<string, string> => {
    try {
      return JSON.parse(localStorage.getItem('customAssets.nameMap') || '{}');
    } catch {
      return {};
    }
  };
  const setNameMap = (map: Record<string, string>) => {
    localStorage.setItem('customAssets.nameMap', JSON.stringify(map));
  };

  // Load custom assets from backend (repo baseline)
  const loadAssets = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/assets`);
      if (response.ok) {
        const data: CustomAsset[] = await response.json();
        const nameMap = getNameMap();
        const mapped = data.map(a => ({ ...a, originalName: nameMap[a.id] || a.originalName }));
        setAssets(mapped);
      }
    } catch (error) {
      console.error('Failed to load custom assets:', error);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle file upload (repo baseline uses /api/upload with field 'asset')
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
        const response = await fetch(`${getBackendUrl()}/api/upload`, {
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

  // Add custom asset to canvas (repo baseline)
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
        src: `${getBackendUrl()}${asset.path}`,
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

  // Delete custom asset (repo baseline)
  const deleteAsset = async (asset: CustomAsset) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Delete ${asset.originalName}?`)) return;

    try {
      const response = await fetch(`${getBackendUrl()}/api/assets/${asset.filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAssets(prev => prev.filter(a => a.id !== asset.id));
        const nameMap = getNameMap();
        if (nameMap[asset.id]) {
          delete nameMap[asset.id];
          setNameMap(nameMap);
        }
      } else {
        alert('Failed to delete asset');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error deleting asset');
    }
  };

  // Rename custom asset (client-persisted + backend notify)
  const renameAsset = async (asset: CustomAsset) => {
    const current = asset.originalName || '';
    const name = prompt('Rename asset', current)?.trim();
    if (!name || name === current) return;
    try {
      await fetch(`${getBackendUrl()}/api/assets/${asset.id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    } catch (e) {
      // Best-effort: backend doesn't persist; continue with client-side map
      console.warn('Rename notify failed, using client-side map only');
    }
    setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, originalName: name } : a));
    const nameMap = getNameMap();
    nameMap[asset.id] = name;
    setNameMap(nameMap);
  };

  // Helpers to build embed URLs (repo baseline)
  const buildYouTubeEmbed = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.slice(1);
        return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const buildInstagramEmbed = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (!u.hostname.includes('instagram.')) return null;
      return `${u.origin}${u.pathname.replace(/\/?$/, '/') }embed`;
    } catch {
      return null;
    }
  };

  const addEmbedToCanvas = () => {
    setEmbedError(null);
    const url = embedUrl.trim();
    if (!url) return;
    const yt = buildYouTubeEmbed(url);
    const ig = yt ? null : buildInstagramEmbed(url);
    const embedSrc = yt || ig;
    if (!embedSrc) {
      setEmbedError('Enter a valid YouTube or Instagram URL');
      return;
    }
    if (!currentProject) {
      alert('Please create a project first');
      return;
    }
    const newObject = {
      id: `embed-${Date.now()}`,
      type: 'videoEmbed' as const,
      x: 120 + Math.random() * 120,
      y: 120 + Math.random() * 120,
      width: 400,
      height: 700,
      properties: {
        src: embedSrc,
        originalUrl: url,
        provider: yt ? 'youtube' : 'instagram'
      },
      animationStart: 0,
      animationDuration: 5,
      animationType: 'none' as const,
      animationEasing: 'easeOut' as const
    };
    addObject(newObject);
    setEmbedUrl('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Open Pro Draw Editor (added on top of repo code)
  const openProEditor = (asset: CustomAsset) => {
    console.log('Opening ProDrawEditor for asset:', asset);
    setSelectedAsset(asset);
    setShowProEditor(true);
  };

  const closeProEditor = () => {
    console.log('Closing ProDrawEditor');
    setShowProEditor(false);
    setSelectedAsset(null);
  };

  // Filter assets based on search term
  const filteredAssets = assets.filter(asset =>
    asset.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-300">Custom Assets</h4>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded overflow-hidden border border-gray-700">
            <button
              className={`px-2 py-1 text-xs ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300'}`}
              title="Grid view"
              onClick={() => { setViewMode('grid'); localStorage.setItem('customAssets.viewMode', 'grid'); }}
            >
              ⬚
            </button>
            <button
              className={`px-2 py-1 text-xs ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300'}`}
              title="List view"
              onClick={() => { setViewMode('list'); localStorage.setItem('customAssets.viewMode', 'list'); }}
            >
              ☰
            </button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* URL Embeds (YouTube / Instagram) */}
      <div className="mb-3 p-2 bg-gray-800 rounded border border-gray-700">
        <div className="text-xs text-gray-300 mb-2">Add YouTube or Instagram URL</div>
        <div className="flex items-stretch gap-0 overflow-hidden rounded border border-gray-700 bg-gray-700">
          <span className="px-3 flex items-center text-gray-300">🔗</span>
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/reel/..."
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            className="flex-1 p-2 bg-transparent text-white text-sm focus:outline-none"
          />
          <button
            onClick={addEmbedToCanvas}
            className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
            title="Add video"
          >
            Add
          </button>
        </div>
        {embedError && <div className="text-xs text-red-400 mt-1">{embedError}</div>}
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

      {/* Asset List/Grid */}
      <div className={`flex-1 min-h-0 overflow-auto ${viewMode === 'grid' ? '' : ''}`}>
        {filteredAssets.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
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
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredAssets.map((asset) => (
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
                      src={`${getBackendUrl()}${asset.path}`}
                      alt={asset.originalName}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-xs text-gray-300 group-hover:text-white truncate">
                    {asset.originalName}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {formatFileSize(asset.size)}
                  </div>
                </button>

                {/* Actions */}
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openProEditor(asset); }}
                    className="px-1.5 h-6 bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded"
                    title="Open in Pro Editor"
                  >Pro</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); renameAsset(asset); }}
                    className="px-1.5 h-6 bg-gray-600 hover:bg-gray-500 text-white text-[10px] rounded"
                    title="Rename"
                  >Ren</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteAsset(asset); }}
                    className="px-1.5 h-6 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded"
                    title="Delete"
                  >Del</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 py-2">
                <button
                  onClick={() => addCustomAssetToCanvas(asset)}
                  className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                  title={`Add ${asset.originalName} to canvas`}
                >
                  <img
                    src={`${getBackendUrl()}${asset.path}`}
                    alt={asset.originalName}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{asset.originalName}</div>
                  <div className="text-xs text-gray-400">{formatFileSize(asset.size)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openProEditor(asset)}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                  >Pro Edit</button>
                  <button
                    onClick={() => renameAsset(asset)}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                  >Rename</button>
                  <button
                    onClick={() => deleteAsset(asset)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                  >Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pro Draw Editor Modal */}
      {showProEditor && selectedAsset && (() => {
        console.log('Rendering ProDrawEditor floating variant:', { showProEditor, selectedAsset: selectedAsset?.filename });
        return (
          <ProDrawEditor
            isOpen={true}
            assetSrc={`${getBackendUrl()}${selectedAsset.path}`}
            assetId={selectedAsset.id}
            variant="floating"
            onClose={closeProEditor}
          />
        );
      })()}

      {/* Footer Info (compact) */}
      <div className="pt-2 text-[11px] text-gray-400">
        <span className="mr-2">Supported: JPG, PNG, GIF, SVG</span>
        <span className="mr-2">Max: 5MB</span>
        <span>Total: {assets.length}</span>
      </div>
    </div>
  );
};

export default CustomAssets;