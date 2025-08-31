// Types of overlays we support
export type OverlayKind = 'videoEmbed' | 'svgVivus' | 'custom';

// Overlay entry in the manager
interface OverlayEntry {
  id: string;
  kind: OverlayKind;
  element: HTMLElement;
  lastUpdate: number;
}

// Overlay Manager handles DOM overlays positioned over the Konva canvas
export class OverlayManager {
  private overlayRoot: HTMLDivElement | null = null;
  private overlays: Map<string, OverlayEntry> = new Map();
  private gcThreshold = 30000; // 30 seconds

  setRoot(root: HTMLDivElement): void {
    this.overlayRoot = root;
  }

  // Ensure an overlay exists for the given id and kind
  ensure(id: string, kind: OverlayKind): HTMLElement | null {
    if (!this.overlayRoot) return null;

    let entry = this.overlays.get(id);
    if (!entry) {
      const element = document.createElement('div');
      element.id = `overlay-${id}`;
      element.style.position = 'absolute';
      element.style.pointerEvents = 'none';
      element.style.willChange = 'transform, opacity';
      element.style.transformOrigin = 'top left';

      this.overlayRoot.appendChild(element);

      entry = { id, kind, element, lastUpdate: Date.now() };
      this.overlays.set(id, entry);
    }

    entry.lastUpdate = Date.now();
    return entry.element;
  }

  // Update the position and size of an overlay
  updateBox(id: string, x: number, y: number, width: number, height: number, rotation: number = 0, opacity: number = 1): void {
    const entry = this.overlays.get(id);
    if (!entry) return;

    const element = entry.element;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.opacity = String(opacity);
    element.style.transform = `rotate(${rotation}deg)`;

    entry.lastUpdate = Date.now();
  }

  // Set pointer events for an overlay (for interactive elements)
  setPointer(id: string, enabled: boolean): void {
    const entry = this.overlays.get(id);
    if (!entry) return;

    entry.element.style.pointerEvents = enabled ? 'auto' : 'none';
    entry.lastUpdate = Date.now();
  }

  // Remove an overlay
  remove(id: string): void {
    const entry = this.overlays.get(id);
    if (!entry) return;

    if (entry.element.parentNode) {
      entry.element.parentNode.removeChild(entry.element);
    }
    this.overlays.delete(id);
  }

  // Garbage collect old overlays
  gc(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    Array.from(this.overlays.entries()).forEach(([id, entry]) => {
      if (now - entry.lastUpdate > this.gcThreshold) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.remove(id));
  }

  // Get all active overlay IDs
  getActiveIds(): string[] {
    return Array.from(this.overlays.keys());
  }

  // Clear all overlays
  clear(): void {
    Array.from(this.overlays.keys()).forEach(id => this.remove(id));
  }
}

// Global overlay manager instance
export const overlayManager = new OverlayManager();

// React hook for using overlay manager
export const useOverlayManager = () => {
  return overlayManager;
};
