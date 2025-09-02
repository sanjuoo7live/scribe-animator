import Konva from 'konva';
import { HandAsset, ToolAsset, HandToolComposition } from '../types/handAssets';
import { HandToolCompositor } from './handToolCompositor';

export interface ThreeLayerHandConfig {
  handAsset: HandAsset;
  toolAsset: ToolAsset;
  pathPosition: { x: number; y: number };
  pathAngle: number;
  scale: number;
  opacity?: number;
  debug?: boolean;
  mirror?: boolean;
  showForeground?: boolean;
  extraOffset?: { x: number; y: number };
}

export class ThreeLayerHandRenderer {
  private handBgImage: HTMLImageElement | null = null;
  private handFgImage: HTMLImageElement | null = null;
  private toolImage: HTMLImageElement | null = null;
  private composition: HandToolComposition | null = null;
  private debugEnabled: boolean = false;
  private dbg = {
    handRect: null as Konva.Rect | null,
    toolRect: null as Konva.Rect | null,
    tipCircle: null as Konva.Circle | null,
  };

  /**
   * Load all three images for the hand-tool combination
   */
  async loadAssets(handAsset: HandAsset, toolAsset: ToolAsset): Promise<void> {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      // Load all three images in parallel
      const [handBg, handFg, tool] = await Promise.all([
        loadImage(handAsset.imageBg),
        loadImage(handAsset.imageFg),
        loadImage(toolAsset.image)
      ]);

      this.handBgImage = handBg;
      this.handFgImage = handFg;
      this.toolImage = tool;
    } catch (error) {
      console.error('Failed to load hand-tool assets:', error);
      throw error;
    }
  }

  /**
   * Create the three-layer Konva group with proper Z-ordering
   */
  createThreeLayerGroup(config: ThreeLayerHandConfig): Konva.Group {
    if (!this.handBgImage || !this.handFgImage || !this.toolImage) {
      throw new Error('Assets not loaded. Call loadAssets() first.');
    }

    // Calculate the composition transforms
    const handForCalc = config.mirror ? HandToolCompositor.mirrorHandAsset(config.handAsset) : config.handAsset;
    const pos = config.extraOffset ? { x: config.pathPosition.x + config.extraOffset.x, y: config.pathPosition.y + config.extraOffset.y } : config.pathPosition;
    this.composition = HandToolCompositor.composeHandTool(
      handForCalc,
      config.toolAsset,
      pos,
      config.pathAngle,
      config.scale
    );

  // Create the main group
    const handGroup = new Konva.Group({
      x: 0,
      y: 0,
      opacity: config.opacity || 1.0
    });

    // Layer 1 (Bottom): Hand Background (palm + lower fingers)
    const handBgNode = new Konva.Image({
      image: this.handBgImage,
      x: this.composition.handPosition.x,
      y: this.composition.handPosition.y,
      rotation: this.composition.handRotation,
      scaleX: (config.mirror ? -1 : 1) * this.composition.handScale,
      scaleY: this.composition.handScale
    });

    // Layer 2 (Middle): Tool (pen, brush, marker, etc.)
    const toolNode = new Konva.Image({
      image: this.toolImage,
      x: this.composition.toolPosition.x,
      y: this.composition.toolPosition.y,
      rotation: this.composition.toolRotation,
      scaleX: this.composition.toolScale,
      scaleY: this.composition.toolScale
    });

    // Layer 3 (Top): Hand Foreground (top fingers + thumb for depth)
    const handFgNode = new Konva.Image({
      image: this.handFgImage,
      x: this.composition.handPosition.x,
      y: this.composition.handPosition.y,
      rotation: this.composition.handRotation,
      scaleX: (config.mirror ? -1 : 1) * this.composition.handScale,
      scaleY: this.composition.handScale
    });
    if (config.showForeground === false) {
      handFgNode.visible(false);
    }

    // Add layers in correct Z-order with explicit ordering
    handGroup.add(handBgNode);  // Bottom layer
    handGroup.add(toolNode);    // Middle layer
    handGroup.add(handFgNode);  // Top layer
    
    // Explicitly ensure proper Z-order (Konva specific)
    handBgNode.zIndex(0);  // Bottom
    toolNode.zIndex(1);    // Middle  
    handFgNode.zIndex(2);  // Top (thumb should be over pen)

    return handGroup;
  }

  /**
   * Update the hand position along a path while maintaining proper layering
   */
  updatePosition(
    handGroup: Konva.Group,
    config: ThreeLayerHandConfig
  ): void {
    if (!handGroup || handGroup.children.length !== 3) {
      console.error('Invalid hand group for position update');
      return;
    }

    // Recalculate composition for new position
    const handForCalc = config.mirror ? HandToolCompositor.mirrorHandAsset(config.handAsset) : config.handAsset;
    const pos = config.extraOffset ? { x: config.pathPosition.x + config.extraOffset.x, y: config.pathPosition.y + config.extraOffset.y } : config.pathPosition;
    this.composition = HandToolCompositor.composeHandTool(
      handForCalc,
      config.toolAsset,
      pos,
      config.pathAngle,
      config.scale
    );

  const [handBgNode, toolNode, handFg] = handGroup.children.slice(0, 3) as Konva.Image[];

    // Update hand background and foreground (they move together)
    const handTransform = {
      x: this.composition.handPosition.x,
      y: this.composition.handPosition.y,
      rotation: this.composition.handRotation,
      scaleX: (config.mirror ? -1 : 1) * this.composition.handScale,
      scaleY: this.composition.handScale
    };

  handBgNode.setAttrs(handTransform);
  handFg.setAttrs(handTransform);

    // Update tool independently
    toolNode.setAttrs({
      x: this.composition.toolPosition.x,
      y: this.composition.toolPosition.y,
      rotation: this.composition.toolRotation,
      scaleX: this.composition.toolScale,
      scaleY: this.composition.toolScale
    });

    // Foreground visibility toggle
    if (config.showForeground === false) {
      handFg.visible(false);
    } else {
      handFg.visible(true);
      // Ensure foreground stays on top during updates
      handFg.moveToTop();
    }
  }

  /**
   * Get the final tip position for path alignment verification
   */
  getTipPosition(): { x: number; y: number } | null {
    return this.composition?.finalTipPosition || null;
  }

  /**
   * Create a debug visualization showing anchor points
   */
  createDebugVisualization(config: ThreeLayerHandConfig): Konva.Group {
    const debugGroup = new Konva.Group();

    if (!this.composition) return debugGroup;

    // Hand grip points
    const handGripCircle = new Konva.Circle({
      x: this.composition.handPosition.x,
      y: this.composition.handPosition.y,
      radius: 5,
      fill: 'red',
      opacity: 0.7
    });

    // Tool socket points
    const toolSocketCircle = new Konva.Circle({
      x: this.composition.toolPosition.x,
      y: this.composition.toolPosition.y,
      radius: 5,
      fill: 'blue',
      opacity: 0.7
    });

    // Final tip position
    const tipCircle = new Konva.Circle({
      x: this.composition.finalTipPosition.x,
      y: this.composition.finalTipPosition.y,
      radius: 3,
      fill: 'green',
      opacity: 0.8
    });

    // Connection lines
    const gripLine = new Konva.Line({
      points: [
        this.composition.handPosition.x, this.composition.handPosition.y,
        this.composition.toolPosition.x, this.composition.toolPosition.y
      ],
      stroke: 'yellow',
      strokeWidth: 1,
      opacity: 0.5
    });

    debugGroup.add(handGripCircle);
    debugGroup.add(toolSocketCircle);
    debugGroup.add(tipCircle);
    debugGroup.add(gripLine);

    return debugGroup;
  }

  /**
   * Dispose of loaded assets to free memory
   */
  dispose(): void {
    this.handBgImage = null;
    this.handFgImage = null;
    this.toolImage = null;
    this.composition = null;
  }
}

// Utility function for easy three-layer hand creation
export async function createThreeLayerHand(config: ThreeLayerHandConfig): Promise<Konva.Group> {
  const renderer = new ThreeLayerHandRenderer();
  await renderer.loadAssets(config.handAsset, config.toolAsset);
  return renderer.createThreeLayerGroup(config);
}

// Animation helper for moving three-layer hands along paths
export class ThreeLayerHandAnimator {
  private renderer: ThreeLayerHandRenderer;
  private handGroup: Konva.Group | null = null;

  constructor(renderer: ThreeLayerHandRenderer) {
    this.renderer = renderer;
  }

  /**
   * Animate the three-layer hand along a path
   */
  animateAlongPath(
    handGroup: Konva.Group,
    pathPoints: Array<{ x: number; y: number; angle: number }>,
    duration: number,
    config: Omit<ThreeLayerHandConfig, 'pathPosition' | 'pathAngle'>
  ): Konva.Tween {
    let currentIndex = 0;
    let startTime = 0;

    const tween = new Konva.Tween({
      node: handGroup,
      duration: duration,
      onUpdate: () => {
        if (startTime === 0) startTime = Date.now();
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        const targetIndex = Math.floor(progress * (pathPoints.length - 1));
        
        if (targetIndex !== currentIndex && targetIndex < pathPoints.length) {
          currentIndex = targetIndex;
          const point = pathPoints[targetIndex];
          
          this.renderer.updatePosition(handGroup, {
            ...config,
            pathPosition: { x: point.x, y: point.y },
            pathAngle: point.angle
          });
        }
      }
    });

    return tween;
  }
}
