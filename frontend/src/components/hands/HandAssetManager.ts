/**
 * Hand Asset Management System
 * 
 * Manages hand SVG assets, their pen tip anchor points, and rotation offsets
 * for the Hand Follower System.
 */

export interface HandAsset {
  id: string;
  name: string;
  imagePath: string; // Path to image file (SVG, PNG, JPG, etc.)
  imageType: 'svg' | 'png' | 'jpg' | 'gif'; // Image format
  tipAnchor: { x: number; y: number }; // Pen tip position in image coordinates (0-1 normalized)
  rotationOffset: number; // Degrees to align with path tangent
  scale: number; // Default scale factor
  category: 'hand' | 'tool'; // Category for organization
  isCustom?: boolean; // Whether this is a user-uploaded asset
  width?: number; // Image width in pixels
  height?: number; // Image height in pixels
}

export class HandAssetManager {
  private static assets: HandAsset[] = [
    // Real Hand Assets - Phase 2.5
    {
      id: 'realistic-hand-pencil-01',
      name: 'Realistic Hand with Pencil',
      imagePath: '/assets/hands/realistic/hand-right-pencil-01.png',
      imageType: 'png',
      tipAnchor: { x: 0.75, y: 0.87 }, // Calibrated position for attached image
      rotationOffset: -45,
      scale: 1.0,
      category: 'hand',
      isCustom: false
    },
    
    // Fallback Hand Assets (using preset system)
    {
      id: 'right-light-pencil',
      name: 'Right Hand (Light) - Pencil',
      imagePath: '/assets/hands/Right_hand_pen/fg.png',
      imageType: 'png',
      tipAnchor: { x: 0.7, y: 0.8 }, // Normalized coordinates
      rotationOffset: -45, // Degrees
      scale: 1.0,
      category: 'hand'
    },
    {
      id: 'right-medium-pencil',
      name: 'Right Hand (Medium) - Pencil',
      imagePath: '/assets/hands/Right_hand_pen/fg.png',
      imageType: 'png',
      tipAnchor: { x: 0.7, y: 0.8 },
      rotationOffset: -45,
      scale: 1.0,
      category: 'hand'
    },
    {
      id: 'right-dark-pencil',
      name: 'Right Hand (Dark) - Pencil',
      imagePath: '/assets/hands/Right_hand_pen/fg.png',
      imageType: 'png',
      tipAnchor: { x: 0.7, y: 0.8 },
      rotationOffset: -45,
      scale: 1.0,
      category: 'hand'
    },
    
    // Left Hand Assets (mirrored from right hand)
    {
      id: 'left-light-pencil',
      name: 'Left Hand (Light) - Pencil',
      imagePath: '/assets/hands/Right_hand_pen/fg.png',
      imageType: 'png',
      tipAnchor: { x: 0.3, y: 0.8 }, // Mirrored for left hand
      rotationOffset: 45, // Opposite rotation for left hand
      scale: 1.0,
      category: 'hand'
    },
    {
      id: 'left-medium-pencil',
      name: 'Left Hand (Medium) - Pencil',
      imagePath: '/assets/hands/Right_hand_pen/fg.png',
      imageType: 'png',
      tipAnchor: { x: 0.3, y: 0.8 },
      rotationOffset: 45,
      scale: 1.0,
      category: 'hand'
    },
    {
      id: 'left-dark-pencil',
      name: 'Left Hand (Dark) - Pencil',
      imagePath: '/assets/hands/Right_hand_pen/fg.png',
      imageType: 'png',
      tipAnchor: { x: 0.3, y: 0.8 },
      rotationOffset: 45,
      scale: 1.0,
      category: 'hand'
    },

    // Tool Only Assets (using preset system)
    {
      id: 'pencil-only',
      name: 'Pencil Only',
      imagePath: '/assets/tools/pencil_yellow_standard/tool.png',
      imageType: 'png',
      tipAnchor: { x: 0.5, y: 1.0 }, // Tip of pencil
      rotationOffset: 0,
      scale: 0.8,
      category: 'tool'
    },
    {
      id: 'pen-only',
      name: 'Pen Only',
      imagePath: '/assets/tools/pen_black_slim/tool.png',
      imageType: 'png',
      tipAnchor: { x: 0.5, y: 1.0 },
      rotationOffset: 0,
      scale: 0.8,
      category: 'tool'
    },
    {
      id: 'marker-only',
      name: 'Marker Only',
      imagePath: '/assets/tools/pen_black_thick/tool.png',
      imageType: 'png',
      tipAnchor: { x: 0.5, y: 1.0 },
      rotationOffset: 0,
      scale: 0.8,
      category: 'tool'
    },
    {
      id: 'brush-only',
      name: 'Brush Only',
      imagePath: '/assets/tools/pen_black_thick/tool.png',
      imageType: 'png',
      tipAnchor: { x: 0.5, y: 1.0 },
      rotationOffset: 0,
      scale: 0.8,
      category: 'tool'
    }
  ];

  /**
   * Load a hand asset by ID
   */
  static async loadHandAsset(assetId: string): Promise<HandAsset | null> {
    const asset = this.assets.find(a => a.id === assetId);
    if (!asset) {
      console.warn(`Hand asset not found: ${assetId}`);
      return null;
    }

    // Verify the image file exists (basic check)
    try {
      const response = await fetch(asset.imagePath, { method: 'HEAD' });
      if (!response.ok) {
        console.warn(`Hand asset image not accessible: ${asset.imagePath}`);
        return null;
      }
    } catch (error) {
      console.warn(`Error checking hand asset: ${error}`);
      return null;
    }

    return asset;
  }

  /**
   * Get all available hand assets
   */
  static getAvailableHands(): HandAsset[] {
    return [...this.assets];
  }

  /**
   * Get assets by category
   */
  static getHandsByCategory(category: 'hand' | 'tool'): HandAsset[] {
    return this.assets.filter(asset => asset.category === category);
  }

  /**
   * Get the default hand asset (realistic hand if available)
   */
  static getDefaultHandAsset(): HandAsset | null {
    // Prefer realistic hand asset if available
    const realisticHand = this.assets.find(asset => asset.id === 'realistic-hand-pencil-01');
    if (realisticHand) return realisticHand;
    
    // Fallback to first available asset
    return this.assets[0] || null;
  }

  /**
   * Create hand asset from uploaded image file
   */
  static async createHandAssetFromFile(
    file: File,
    tipAnchor: { x: number; y: number },
    name?: string
  ): Promise<HandAsset> {
    // Generate unique ID
    const id = `custom-hand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create blob URL for the image
    const imageUrl = URL.createObjectURL(file);
    
    // Get image dimensions
    const dimensions = await this.getImageDimensions(imageUrl);
    
    const asset: HandAsset = {
      id,
      name: name || `Custom Hand ${new Date().toLocaleDateString()}`,
      imagePath: imageUrl,
      imageType: this.getImageType(file.name),
      tipAnchor,
      rotationOffset: -45, // Default rotation
      scale: 1.0,
      category: 'hand',
      isCustom: true,
      width: dimensions.width,
      height: dimensions.height
    };

    // Add to assets array (simulating custom assets storage)
    this.assets.push(asset);
    
    return asset;
  }

  /**
   * Save user's attached hand image as primary realistic asset
   */
  static async saveRealisticHandAsset(
    imageFile: File,
    tipAnchor: { x: number; y: number }
  ): Promise<void> {
    try {
      // Create a more permanent asset for the realistic hand
      const asset: HandAsset = {
        id: 'realistic-hand-pencil-01',
        name: 'Realistic Hand with Pencil',
        imagePath: URL.createObjectURL(imageFile),
        imageType: 'png',
        tipAnchor,
        rotationOffset: -45,
        scale: 1.0,
        category: 'hand',
        isCustom: false
      };

      // Update the realistic hand asset in our assets array
      const existingIndex = this.assets.findIndex(a => a.id === 'realistic-hand-pencil-01');
      if (existingIndex >= 0) {
        this.assets[existingIndex] = asset;
      } else {
        this.assets.unshift(asset); // Add at beginning as primary
      }

      console.log('Realistic hand asset saved successfully');
    } catch (error) {
      console.error('Failed to save realistic hand asset:', error);
      throw error;
    }
  }

  /**
   * Determine image type from filename
   */
  private static getImageType(filename: string): 'png' | 'jpg' | 'gif' | 'svg' {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'png': return 'png';
      case 'jpg':
      case 'jpeg': return 'jpg';
      case 'gif': return 'gif';
      case 'svg': return 'svg';
      default: return 'png';
    }
  }

  /**
   * Calibrate tip anchor for a hand asset
   * Returns a new asset object with updated anchor point
   */
  static calibrateTipAnchor(asset: HandAsset, newAnchor: { x: number; y: number }): HandAsset {
    return {
      ...asset,
      tipAnchor: {
        x: Math.max(0, Math.min(1, newAnchor.x)), // Clamp to 0-1
        y: Math.max(0, Math.min(1, newAnchor.y))
      }
    };
  }

  /**
   * Update rotation offset for a hand asset
   */
  static updateRotationOffset(asset: HandAsset, newOffset: number): HandAsset {
    return {
      ...asset,
      rotationOffset: newOffset
    };
  }

  /**
   * Convert normalized tip anchor to actual pixel coordinates
   * based on the rendered size of the hand asset
   */
  static getTipPixelPosition(
    asset: HandAsset, 
    renderWidth: number, 
    renderHeight: number
  ): { x: number; y: number } {
    return {
      x: asset.tipAnchor.x * renderWidth,
      y: asset.tipAnchor.y * renderHeight
    };
  }

  /**
   * Register a custom hand asset
   * Useful for user-uploaded hand assets
   */
  static registerCustomAsset(asset: Omit<HandAsset, 'id'> & { id?: string }): HandAsset {
    const id = asset.id || `custom-${Date.now()}`;
    const customAsset: HandAsset = {
      ...asset,
      id,
      tipAnchor: {
        x: Math.max(0, Math.min(1, asset.tipAnchor.x)),
        y: Math.max(0, Math.min(1, asset.tipAnchor.y))
      }
    };

    // Add to assets list if not already present
    const existingIndex = this.assets.findIndex(a => a.id === id);
    if (existingIndex >= 0) {
      this.assets[existingIndex] = customAsset;
    } else {
      this.assets.push(customAsset);
    }

    return customAsset;
  }

  /**
   * Upload and register a custom hand asset from file
   * Supports PNG, JPG, GIF, and SVG formats
   */
  static async uploadCustomAsset(
    file: File,
    name: string,
    tipAnchor: { x: number; y: number } = { x: 0.5, y: 0.8 },
    rotationOffset: number = 0,
    category: 'hand' | 'tool' = 'hand'
  ): Promise<HandAsset | null> {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Unsupported file type. Please use PNG, JPG, GIF, or SVG.');
      return null;
    }

    // Determine image type
    let imageType: 'svg' | 'png' | 'jpg' | 'gif';
    if (file.type === 'image/svg+xml') imageType = 'svg';
    else if (file.type === 'image/png') imageType = 'png';
    else if (file.type === 'image/jpeg' || file.type === 'image/jpg') imageType = 'jpg';
    else if (file.type === 'image/gif') imageType = 'gif';
    else imageType = 'png'; // fallback

    try {
      // Create object URL for the file
      const imageUrl = URL.createObjectURL(file);
      
      // Create custom asset
      const customAsset: HandAsset = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name || file.name,
        imagePath: imageUrl,
        imageType,
        tipAnchor: {
          x: Math.max(0, Math.min(1, tipAnchor.x)),
          y: Math.max(0, Math.min(1, tipAnchor.y))
        },
        rotationOffset,
        scale: 1.0,
        category,
        isCustom: true
      };

      // Validate the asset
      const validationErrors = this.validateAsset(customAsset);
      if (validationErrors.length > 0) {
        console.error('Custom asset validation failed:', validationErrors);
        URL.revokeObjectURL(imageUrl);
        return null;
      }

      // Register the asset
      this.assets.push(customAsset);
      return customAsset;

    } catch (error) {
      console.error('Error uploading custom asset:', error);
      return null;
    }
  }

  /**
   * Create a custom asset from a base64 data URL
   * Useful for programmatically created images
   */
  static createCustomAssetFromDataURL(
    dataUrl: string,
    name: string,
    imageType: 'png' | 'jpg' | 'gif' = 'png',
    tipAnchor: { x: number; y: number } = { x: 0.5, y: 0.8 },
    rotationOffset: number = 0,
    category: 'hand' | 'tool' = 'hand'
  ): HandAsset {
    const customAsset: HandAsset = {
      id: `custom-dataurl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      imagePath: dataUrl,
      imageType,
      tipAnchor: {
        x: Math.max(0, Math.min(1, tipAnchor.x)),
        y: Math.max(0, Math.min(1, tipAnchor.y))
      },
      rotationOffset,
      scale: 1.0,
      category,
      isCustom: true
    };

    this.assets.push(customAsset);
    return customAsset;
  }

  /**
   * Get image dimensions for proper scaling
   * Returns a promise that resolves with width and height
   */
  static getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imagePath}`));
      };
      img.src = imagePath;
    });
  }

  /**
   * Auto-detect tip anchor for hand images
   * Uses simple heuristics - could be enhanced with ML/CV
   */
  static async autoDetectTipAnchor(asset: HandAsset): Promise<{ x: number; y: number }> {
    // Simple heuristics based on asset category and name
    if (asset.category === 'tool') {
      return { x: 0.5, y: 1.0 }; // Bottom center for tools
    }

    // For hands, assume tip is at 70% right, 80% down for right hands
    if (asset.name.toLowerCase().includes('right')) {
      return { x: 0.7, y: 0.8 };
    }
    
    // For left hands, mirror the position
    if (asset.name.toLowerCase().includes('left')) {
      return { x: 0.3, y: 0.8 };
    }

    // Default fallback
    return { x: 0.5, y: 0.8 };
  }

  /**
   * Remove a custom asset and clean up resources
   */
  static removeCustomAsset(assetId: string): boolean {
    const index = this.assets.findIndex(a => a.id === assetId && a.isCustom);
    if (index >= 0) {
      const asset = this.assets[index];
      
      // Clean up object URL if it's a custom upload
      if (asset.imagePath.startsWith('blob:')) {
        URL.revokeObjectURL(asset.imagePath);
      }
      
      this.assets.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all custom assets
   */
  static getCustomAssets(): HandAsset[] {
    return this.assets.filter(asset => asset.isCustom);
  }

  /**
   * Export custom assets configuration (without blob URLs)
   * Useful for saving custom assets to project files
   */
  static exportCustomAssetsConfig(): Partial<HandAsset>[] {
    return this.getCustomAssets().map(asset => ({
      id: asset.id,
      name: asset.name,
      imageType: asset.imageType,
      tipAnchor: asset.tipAnchor,
      rotationOffset: asset.rotationOffset,
      scale: asset.scale,
      category: asset.category,
      // Note: imagePath (blob URL) is excluded as it's not serializable
    }));
  }

  /**
   * Get asset suggestions based on path characteristics
   * This could be enhanced with ML/AI in the future
   */
  static suggestAssetForPath(pathData: string): HandAsset[] {
    // Simple heuristic: suggest right hand for most paths
    // Could be enhanced to analyze path direction, complexity, etc.
    return this.assets.filter(asset => 
      asset.category === 'hand' && asset.id.includes('right')
    ).slice(0, 3);
  }

  /**
   * Validate that an asset has all required properties
   */
  static validateAsset(asset: Partial<HandAsset>): string[] {
    const errors: string[] = [];

    if (!asset.id) errors.push('Missing asset ID');
    if (!asset.name) errors.push('Missing asset name');
    if (!asset.imagePath) errors.push('Missing image path');
    if (!asset.imageType) errors.push('Missing image type');
    if (!asset.tipAnchor) {
      errors.push('Missing tip anchor');
    } else {
      if (typeof asset.tipAnchor.x !== 'number' || asset.tipAnchor.x < 0 || asset.tipAnchor.x > 1) {
        errors.push('Invalid tip anchor X coordinate (must be 0-1)');
      }
      if (typeof asset.tipAnchor.y !== 'number' || asset.tipAnchor.y < 0 || asset.tipAnchor.y > 1) {
        errors.push('Invalid tip anchor Y coordinate (must be 0-1)');
      }
    }
    if (typeof asset.rotationOffset !== 'number') errors.push('Invalid rotation offset');
    if (typeof asset.scale !== 'number' || asset.scale <= 0) errors.push('Invalid scale (must be > 0)');

    return errors;
  }
}
