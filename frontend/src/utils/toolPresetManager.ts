/**
 * Tool Preset Manager (Phase 2)
 * Optional independent tools library. If the tools manifest is missing,
 * all methods gracefully return empty results so callers can fall back to
 * hand-bound tools in HandPreset.
 */

import { ToolPreset, ToolPresetManifest, ToolPresetManifestEntry } from '../types/handPresets';

export class ToolPresetManager {
  private static cache: Map<string, ToolPreset> = new Map();
  private static manifest: ToolPresetManifest | null = null;
  private static tried = false;

  static async loadManifest(): Promise<ToolPresetManifest | null> {
    if (this.manifest) return this.manifest;
    if (this.tried) return null;
    this.tried = true;
    try {
      const res = await fetch('/assets/tools/index.json');
      if (!res.ok) throw new Error(String(res.status));
      this.manifest = await res.json();
      if (!this.manifest || !Array.isArray(this.manifest.sets)) {
        console.warn('[ToolPresetManager] Invalid tools manifest shape at /assets/tools/index.json');
        return null;
      }
      console.log('[ToolPresetManager] Loaded tools manifest:', this.manifest.sets.length);
      return this.manifest!;
    } catch (err) {
      console.warn('[ToolPresetManager] Tools manifest not found or failed to load:', err);
      // No tools library yet — allow callers to treat as optional
      return null;
    }
  }

  static async getAvailablePresets(): Promise<ToolPresetManifestEntry[]> {
    const m = await this.loadManifest();
    return m?.sets || [];
  }

  static async loadPreset(id: string): Promise<ToolPreset | null> {
    if (this.cache.has(id)) return this.cache.get(id)!;
    try {
      const m = await this.loadManifest();
      if (!m) return null;
      const entry = m.sets.find(s => s.id === id);
      if (!entry) return null;
      const res = await fetch(`/assets/tools/${entry.path}`);
      if (!res.ok) throw new Error(String(res.status));
      const preset: ToolPreset = await res.json();
      if (preset.schemaVersion !== 1) return null;
      this.cache.set(id, preset);
      console.log('[ToolPresetManager] Loaded tool preset:', id);
      return preset;
    } catch (err) {
      console.warn('[ToolPresetManager] Failed to load tool preset', id, err);
      return null;
    }
  }

  static getAssetPath(preset: ToolPreset, key: keyof ToolPreset['images']): string {
    const base = `/assets/tools/${preset.id}`;
    return `${base}/${preset.images[key]}`;
  }

  // Convert ToolPreset → legacy ToolAsset
  static presetToLegacyToolAsset(p: ToolPreset) {
    return {
      id: p.id,
      name: p.title,
      description: `${p.type} tool`,
      image: this.getAssetPath(p, 'image'),
      sizePx: { w: p.dimensions.width, h: p.dimensions.height },
      socketBase: { x: p.anchors.socketBase.x, y: p.anchors.socketBase.y },
      socketForward: { x: p.anchors.socketForward.x, y: p.anchors.socketForward.y },
      tipAnchor: { x: p.anchors.tip.x, y: p.anchors.tip.y },
      rotationOffsetDeg: p.render?.rotationOffsetDeg || 0,
      lengthMm: 150,
    };
  }

  static clearCache() { this.cache.clear(); this.manifest = null; this.tried = false; }
}
