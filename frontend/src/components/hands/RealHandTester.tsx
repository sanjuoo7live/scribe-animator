/**
 * Real Hand Image Testing Component
 * Quick component to test the user's hand image with the hand follower system
 */

import React, { useState } from 'react';
import { TipAnchorCalibrator } from './TipAnchorCalibrator';
import { HandAssetManager } from './HandAssetManager';

export const RealHandTester: React.FC = () => {
  const [showCalibrator, setShowCalibrator] = useState(false);
  const [userHandImage, setUserHandImage] = useState<File | null>(null);
  const [tipAnchor, setTipAnchor] = useState({ x: 0.75, y: 0.87 });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUserHandImage(file);
      setShowCalibrator(true);
    }
  };

  const handleCalibrateComplete = async (newTipAnchor: { x: number; y: number }) => {
    if (!userHandImage) return;

    setIsProcessing(true);
    try {
      // Save the realistic hand asset with the calibrated tip anchor
      await HandAssetManager.saveRealisticHandAsset(userHandImage, newTipAnchor);
      setTipAnchor(newTipAnchor);
      setShowCalibrator(false);
      
      alert(`✅ Hand image saved successfully!\n\nTip Position: ${(newTipAnchor.x * 100).toFixed(1)}%, ${(newTipAnchor.y * 100).toFixed(1)}%\n\nYou can now test the hand follower with your real hand image!`);
    } catch (error) {
      console.error('Failed to save hand asset:', error);
      alert('❌ Failed to save hand image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseRecommendedImage = () => {
    // For demo purposes, we'll simulate using the user's attached image
    // In a real implementation, you would have the image file
    alert('📋 To use your attached hand image:\n\n1. Save the image to your computer\n2. Click "Upload Your Hand Image" button\n3. Select the saved image file\n4. Click on the pen tip to calibrate\n5. Test with hand follower!\n\nThe image you provided is perfect for realistic hand animations!');
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg max-w-md">
      <h3 className="text-lg font-semibold mb-4">🖐️ Real Hand Image Testing</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Upload your hand image to test realistic hand following animations.
          </p>
          
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <div className="text-blue-600 mb-2">
                📁
              </div>
              <p className="text-sm text-gray-600">
                Click to upload your hand image
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF supported
              </p>
            </div>
          </label>
        </div>

        <div className="border-t pt-4">
          <button
            onClick={handleUseRecommendedImage}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
          >
            💡 Use Your Attached Hand Image
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            The hand image you provided is perfect for testing!
          </p>
        </div>

        {userHandImage && (
          <div className="border-t pt-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-blue-800 mb-2">
                ✅ Image loaded: {userHandImage.name}
              </p>
              <p className="text-xs text-blue-600">
                Current tip position: {(tipAnchor.x * 100).toFixed(1)}%, {(tipAnchor.y * 100).toFixed(1)}%
              </p>
            </div>
            
            <button
              onClick={() => setShowCalibrator(true)}
              className="w-full mt-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              🎯 Calibrate Pen Tip Position
            </button>
          </div>
        )}

        {isProcessing && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Processing hand image...</p>
          </div>
        )}
      </div>

      {showCalibrator && userHandImage && (
        <TipAnchorCalibrator
          handImage={userHandImage}
          onCalibrateComplete={handleCalibrateComplete}
          onCancel={() => setShowCalibrator(false)}
          existingAnchor={tipAnchor}
        />
      )}
    </div>
  );
};
