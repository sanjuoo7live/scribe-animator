/**
 * Hand Asset Upload Component
 * 
 * Provides UI for uploading custom hand PNG/SVG files and configuring
 * tip anchors and rotation offsets.
 */

import React, { useState, useRef } from 'react';
import { HandAsset, HandAssetManager } from './HandAssetManager';

interface HandAssetUploadProps {
  onAssetUploaded: (asset: HandAsset) => void;
  onClose: () => void;
}

export const HandAssetUpload: React.FC<HandAssetUploadProps> = ({ onAssetUploaded, onClose }) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [tipAnchor, setTipAnchor] = useState({ x: 0.5, y: 0.8 });
  const [rotationOffset, setRotationOffset] = useState(0);
  const [category, setCategory] = useState<'hand' | 'tool'>('hand');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, GIF, or SVG file.');
      return;
    }

    setCurrentFile(file);
    setAssetName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Auto-detect tip anchor based on filename
    const fileName = file.name.toLowerCase();
    if (fileName.includes('right')) {
      setTipAnchor({ x: 0.7, y: 0.8 });
      setRotationOffset(-45);
    } else if (fileName.includes('left')) {
      setTipAnchor({ x: 0.3, y: 0.8 });
      setRotationOffset(45);
    } else if (fileName.includes('tool') || fileName.includes('pen') || fileName.includes('pencil')) {
      setTipAnchor({ x: 0.5, y: 1.0 });
      setRotationOffset(0);
      setCategory('tool');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!currentFile) return;

    setUploading(true);
    try {
      const asset = await HandAssetManager.uploadCustomAsset(
        currentFile,
        assetName,
        tipAnchor,
        rotationOffset,
        category
      );

      if (asset) {
        onAssetUploaded(asset);
        onClose();
      } else {
        alert('Failed to upload asset. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setTipAnchor({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  };

  // Draw preview with tip anchor indicator
  React.useEffect(() => {
    if (!previewUrl || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw tip anchor indicator
      const tipX = tipAnchor.x * canvas.width;
      const tipY = tipAnchor.y * canvas.height;
      
      ctx.fillStyle = 'red';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // Draw crosshair
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tipX - 10, tipY);
      ctx.lineTo(tipX + 10, tipY);
      ctx.moveTo(tipX, tipY - 10);
      ctx.lineTo(tipX, tipY + 10);
      ctx.stroke();
    };
    img.src = previewUrl;
  }, [previewUrl, tipAnchor]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Upload Custom Hand Asset</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml"
            onChange={handleFileInput}
            className="hidden"
          />
          
          {previewUrl ? (
            <div className="space-y-4">
              <canvas
                ref={previewCanvasRef}
                width={200}
                height={200}
                className="mx-auto border border-gray-600 cursor-crosshair"
                onClick={handleCanvasClick}
              />
              <p className="text-sm text-gray-400">
                Click on the image to set the pen tip position (red dot)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl text-gray-500">📁</div>
              <p className="text-white">Drop your hand image here or click to browse</p>
              <p className="text-sm text-gray-400">
                Supports PNG, JPG, GIF, and SVG files
              </p>
            </div>
          )}
        </div>

        {/* Configuration */}
        {previewUrl && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Asset Name
              </label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                placeholder="Enter asset name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as 'hand' | 'tool')}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                >
                  <option value="hand">Hand</option>
                  <option value="tool">Tool Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Rotation Offset (°)
                </label>
                <input
                  type="number"
                  value={rotationOffset}
                  onChange={(e) => setRotationOffset(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                  min="-180"
                  max="180"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tip X Position ({(tipAnchor.x * 100).toFixed(1)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={tipAnchor.x}
                  onChange={(e) => setTipAnchor(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tip Y Position ({(tipAnchor.y * 100).toFixed(1)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={tipAnchor.y}
                  onChange={(e) => setTipAnchor(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !currentFile || !assetName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Asset'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
