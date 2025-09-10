/**
 * Hand Preset Manager
 * Phase 1: Utility for loading and managing hand asset presets
 */

import { HandPreset, HandPresetManifest, HandPresetManifestEntry } from '../types/handPresets';

export class HandPresetManager {
  private static cache: Map<string, HandPreset> = new Map();
  private static manifest: HandPresetManifest | null = null;

  /**
   * Load the main manifest file
   */
  static async loadManifest(): Promise<HandPresetManifest> {
    if (this.manifest) {
      return this.manifest;
    }

    try {
      const response = await fetch('/assets/hands/index.json');
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status}`);
      }
      
      this.manifest = await response.json();
      return this.manifest!
    } catch (error) {
      console.error('Error loading hand preset manifest:', error);
      throw error;
    }
  }

  /**
   * Get all available hand preset entries
   */
  static async getAvailablePresets(): Promise<HandPresetManifestEntry[]> {
    const manifest = await this.loadManifest();
    return manifest.sets;
  }

  /**
   * Load a specific hand preset by ID
   */
  static async loadPreset(id: string): Promise<HandPreset | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    try {
      const manifest = await this.loadManifest();
      const entry = manifest.sets.find(set => set.id === id);
      
      if (!entry) {
        console.warn(`Hand preset not found: ${id}`);
        return null;
      }

      const response = await fetch(`/assets/hands/${entry.path}`);
      if (!response.ok) {
        throw new Error(`Failed to load preset: ${response.status}`);
      }

      const preset: HandPreset = await response.json();
      
      // Validate schema version
      if (preset.schemaVersion !== 1) {
        console.warn(`Unsupported schema version for preset ${id}: ${preset.schemaVersion}`);
        return null;
      }

      // Cache the preset
      this.cache.set(id, preset);
      return preset;
    } catch (error) {
      console.error(`Error loading hand preset ${id}:`, error);
      return null;
    }
  }

  /**
   * Get preset by handedness and tool type
   */
  static async findPresetByAttributes(
    handedness: 'left' | 'right',
    toolType?: 'pencil' | 'pen' | 'marker' | 'chalk' | 'stylus'
  ): Promise<HandPreset | null> {
    const presets = await this.getAvailablePresets();
    
    for (const entry of presets) {
      const preset = await this.loadPreset(entry.id);
      if (!preset) continue;
      
      if (preset.handedness === handedness) {
        if (!toolType || preset.tool.type === toolType) {
          return preset;
        }
      }
    }
    
    return null;
  }

  /**
   * Get the full path to an image asset within a preset
   */
  static getAssetPath(preset: HandPreset, imageName: keyof HandPreset['images']): string {
    const basePath = `/assets/hands/${preset.id}`;
    return `${basePath}/${preset.images[imageName]}`;
  }

  /**
   * Convert a hand preset to the legacy HandAsset format for compatibility
   */
  static presetToLegacyHandAsset(preset: HandPreset) {
    return {
      id: preset.id,
      name: preset.title,
      description: `${preset.handedness} hand with ${preset.tool.type}`,
      imageBg: this.getAssetPath(preset, 'bg'),
      imageFg: this.getAssetPath(preset, 'fg'),
      sizePx: { w: preset.dimensions.width, h: preset.dimensions.height },
      gripBase: preset.anchors.grip,
      gripForward: {
        x: preset.anchors.grip.x + 50, // Estimated forward direction
        y: preset.anchors.grip.y
      },
      naturalTiltDeg: preset.tool.tipNormal * (180 / Math.PI),
      mirrorable: true
    };
  }

  /**
   * Convert a hand preset to the legacy ToolAsset format for compatibility
   */
  static presetToLegacyToolAsset(preset: HandPreset) {
    return {
      id: `${preset.id}_tool`,
      name: `${preset.tool.type} for ${preset.title}`,
      description: `${preset.tool.type} tool`,
      image: this.getAssetPath(preset, 'tool'),
      sizePx: { w: preset.dimensions.width, h: preset.dimensions.height },
      socketBase: {
        x: preset.anchors.grip.x,
        y: preset.anchors.grip.y
      },
      socketForward: {
        x: preset.anchors.grip.x + 50, // Estimated forward direction
        y: preset.anchors.grip.y
      },
      tipAnchor: preset.tool.tip,
      rotationOffsetDeg: preset.tool.tipNormal * (180 / Math.PI),
      lengthMm: preset.tool.lengthPx || 150
    };
  }

  /**
   * Clear the cache (useful for testing or if presets are updated)
   */
  static clearCache(): void {
    this.cache.clear();
    this.manifest = null;
  }

  /**
   * Validate a preset object against the schema
   */
  static validatePreset(preset: any): preset is HandPreset {
    const requiredFields = [
      'schemaVersion', 'id', 'title', 'handedness', 'style', 'skinTone',
      'images', 'dimensions', 'anchors', 'tool', 'render', 'compat'
    ];

    for (const field of requiredFields) {
      if (!(field in preset)) {
        console.warn(`Missing required field in preset: ${field}`);
        return false;
      }
    }

    return preset.schemaVersion === 1;
  }
}
