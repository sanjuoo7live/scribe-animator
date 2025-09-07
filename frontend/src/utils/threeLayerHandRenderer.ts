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
  // Nib anchor in HAND image coordinates (unmirrored). Used to nudge tool only.
  nibAnchor?: { x: number; y: number };
}

export class ThreeLayerHandRenderer {
  private handBgImage: HTMLImageElement | null = null;
  private handFgImage: HTMLImageElement | null = null;
  private toolImage: HTMLImageElement | null = null;
  private composition: HandToolComposition | null = null;
  private debugEnabled: boolean = false;
  // Cached base nib position in hand image coordinates for current assets
  private baseNibInHand: { x: number; y: number } | null = null;
  private baseNibCacheKey: string | null = null;
  private dbg = {
    handRect: null as Konva.Rect | null,
    toolRect: null as Konva.Rect | null,
    tipCircle: null as Konva.Circle | null,
    targetCircle: null as Konva.Circle | null,
    errorLine: null as Konva.Line | null,
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

    // Calculate the composition transforms using the provided world target.
    // Any calibration offset has already been applied by the caller in
    // ThreeLayerHandFollower (in the path's Frenet frame), so we must NOT
    // add it again here to avoid double application and drift.
    const handForCalc = config.mirror ? HandToolCompositor.mirrorHandAsset(config.handAsset) : config.handAsset;
    const toolForCalc = config.mirror ? HandToolCompositor.mirrorToolAsset(config.toolAsset) : config.toolAsset;
    this.composition = HandToolCompositor.composeHandTool(
      handForCalc,
      toolForCalc,
      config.pathPosition,
      config.pathAngle,
      config.scale
    );

    // Use the composition positions directly for tool.
    // For the hand, compute the world position of the grip point and
    // pivot the images around that point. This keeps the hand locked
    // to the tool socket even when mirrored (scaleX < 0).
    const toolPos = this.composition.toolPosition;
    const handRotDeg = (this.composition.handRotation * 180) / Math.PI;
    const toolRotDeg = (this.composition.toolRotation * 180) / Math.PI;

    // The composition was calculated possibly with a mirrored hand model
    // (handForCalc). Reconstruct the world-space grip position from the
    // composition so that we can set it as the node origin (via offset).
    const cosH = Math.cos(this.composition.handRotation);
    const sinH = Math.sin(this.composition.handRotation);
    const handForCalc2 = config.mirror
      ? HandToolCompositor.mirrorHandAsset(config.handAsset)
      : config.handAsset;
    const gripWorld = {
      x: this.composition.handPosition.x + (handForCalc2.gripBase.x * cosH - handForCalc2.gripBase.y * sinH) * this.composition.handScale,
      y: this.composition.handPosition.y + (handForCalc2.gripBase.x * sinH + handForCalc2.gripBase.y * cosH) * this.composition.handScale,
    };

    // Create the main group
    const handGroup = new Konva.Group({
      x: 0,
      y: 0,
      opacity: config.opacity || 1.0,
    });

    // Layer 1 (Bottom): Hand Background (palm + lower fingers)
    const handBgNode = new Konva.Image({
      image: this.handBgImage,
      // Position the node by the grip point and pivot around it
      x: gripWorld.x,
      y: gripWorld.y,
      rotation: handRotDeg,
      scaleX: (config.mirror ? -1 : 1) * this.composition.handScale,
      scaleY: this.composition.handScale,
      // Pivot around the grip in the ORIGINAL (unmirrored) image space
      offsetX: config.handAsset.gripBase.x,
      offsetY: config.handAsset.gripBase.y,
    });

    // Layer 2 (Middle): Tool (pen, brush, marker, etc.)
    const toolNode = new Konva.Image({
      image: this.toolImage,
      // Pivot at tip so the tip stays glued to the path
      x: this.composition.finalTipPosition.x,
      y: this.composition.finalTipPosition.y,
      rotation: toolRotDeg,
      scaleX: (config.mirror ? -1 : 1) * this.composition.toolScale,
      scaleY: this.composition.toolScale,
      offsetX: config.toolAsset.tipAnchor.x,
      offsetY: config.toolAsset.tipAnchor.y,
    });

    // If a nibAnchor is provided (in hand image coordinates), nudge only the tool
    if (config.nibAnchor) {
      // Build or reuse base nib pos in hand space for the active handedness
      const base = this.computeBaseNibInHand(handForCalc, toolForCalc);
      const nibInHand = config.mirror
        ? { x: handForCalc.sizePx.w - config.nibAnchor.x, y: config.nibAnchor.y }
        : config.nibAnchor;
      const dxHand = (nibInHand.x - base.x);
      const dyHand = (nibInHand.y - base.y);
      if (Math.abs(dxHand) + Math.abs(dyHand) > 0.01) {
        const cosH = Math.cos(this.composition.handRotation);
        const sinH = Math.sin(this.composition.handRotation);
        const dxWorld = (dxHand * cosH - dyHand * sinH) * this.composition.handScale;
        const dyWorld = (dxHand * sinH + dyHand * cosH) * this.composition.handScale;
        toolNode.x(toolNode.x() + dxWorld);
        toolNode.y(toolNode.y() + dyWorld);
      }
    }

    // Layer 3 (Top): Hand Foreground (top fingers + thumb for depth)
    const handFgNode = new Konva.Image({
      image: this.handFgImage,
      // Position the node by the grip point and pivot around it
      x: gripWorld.x,
      y: gripWorld.y,
      rotation: handRotDeg,
      scaleX: (config.mirror ? -1 : 1) * this.composition.handScale,
      scaleY: this.composition.handScale,
      // Pivot around the grip in the ORIGINAL (unmirrored) image space
      offsetX: config.handAsset.gripBase.x,
      offsetY: config.handAsset.gripBase.y,
    });
    if (config.showForeground === false) {
      handFgNode.visible(false);
    }

    // Add layers in correct Z-order; avoid per-frame zIndex churn
    handGroup.add(handBgNode);  // Bottom layer
    handGroup.add(toolNode);    // Middle layer
    handGroup.add(handFgNode);  // Top layer

    // Optional debug overlay
    this.debugEnabled = !!config.debug;
    if (this.debugEnabled) {
      const target = { x: config.pathPosition.x, y: config.pathPosition.y };
      const tip = { x: toolNode.x(), y: toolNode.y() };
      const errPts = [target.x, target.y, tip.x, tip.y];
      this.dbg.targetCircle = new Konva.Circle({ x: target.x, y: target.y, radius: 3, fill: 'magenta', opacity: 0.9 });
      this.dbg.tipCircle = new Konva.Circle({ x: tip.x, y: tip.y, radius: 3, fill: 'lime', opacity: 0.9 });
      this.dbg.errorLine = new Konva.Line({ points: errPts, stroke: 'orange', strokeWidth: 1, opacity: 0.7 });
      handGroup.add(this.dbg.errorLine);
      handGroup.add(this.dbg.targetCircle);
      handGroup.add(this.dbg.tipCircle);
    }

    return handGroup;
  }

  /**
   * Update the hand position along a path while maintaining proper layering
   */
  updatePosition(
    handGroup: Konva.Group,
    config: ThreeLayerHandConfig
  ): void {
    // Accept groups that may include extra debug nodes; ensure at least the 3 image layers exist
    if (!handGroup || handGroup.children.length < 3) {
      console.error('Invalid hand group for position update');
      return;
    }

    // Recalculate composition for new position. The caller already applied
    // any calibration offset, so use the provided point directly.
    const handForCalc = config.mirror
      ? HandToolCompositor.mirrorHandAsset(config.handAsset)
      : config.handAsset;
    this.composition = HandToolCompositor.composeHandTool(
      handForCalc,
      (config.mirror ? HandToolCompositor.mirrorToolAsset(config.toolAsset) : config.toolAsset),
      config.pathPosition,
      config.pathAngle,
      config.scale
    );

    // Always pick the first three children as the image layers (bg, tool, fg)
    const [handBgNode, toolNode, handFg] = handGroup.children.slice(0, 3) as Konva.Image[];

    // Recompute world grip position and pivot around it, so mirroring
    // (negative scaleX) keeps the hand locked to the tool socket.
    const cosH = Math.cos(this.composition.handRotation);
    const sinH = Math.sin(this.composition.handRotation);
    // Use the same mirrored/unmirrored hand used for composition above
    const gripWorld = {
      x: this.composition.handPosition.x + (handForCalc.gripBase.x * cosH - handForCalc.gripBase.y * sinH) * this.composition.handScale,
      y: this.composition.handPosition.y + (handForCalc.gripBase.x * sinH + handForCalc.gripBase.y * cosH) * this.composition.handScale,
    };

    const handTransform = {
      x: gripWorld.x,
      y: gripWorld.y,
      rotation: (this.composition.handRotation * 180) / Math.PI,
      scaleX: (config.mirror ? -1 : 1) * this.composition.handScale,
      scaleY: this.composition.handScale,
      offsetX: config.handAsset.gripBase.x,
      offsetY: config.handAsset.gripBase.y,
    } as const;

    handBgNode.setAttrs(handTransform as any);
    handFg.setAttrs(handTransform as any);

    // Update tool pivoting at tip so tip stays fixed when mirrored
    toolNode.setAttrs({
      x: this.composition.finalTipPosition.x,
      y: this.composition.finalTipPosition.y,
      rotation: (this.composition.toolRotation * 180) / Math.PI,
      scaleX: (config.mirror ? -1 : 1) * this.composition.toolScale,
      scaleY: this.composition.toolScale,
      offsetX: config.toolAsset.tipAnchor.x,
      offsetY: config.toolAsset.tipAnchor.y,
    });

    // Apply tool-only nudge from nib anchor in hand space
    if (config.nibAnchor) {
      const activeHand = handForCalc;
      const activeTool = (config.mirror ? HandToolCompositor.mirrorToolAsset(config.toolAsset) : config.toolAsset);
      const base = this.computeBaseNibInHand(activeHand, activeTool);
      const nibInHand = config.mirror
        ? { x: activeHand.sizePx.w - config.nibAnchor.x, y: config.nibAnchor.y }
        : config.nibAnchor;
      const dxHand = (nibInHand.x - base.x);
      const dyHand = (nibInHand.y - base.y);
      if (Math.abs(dxHand) + Math.abs(dyHand) > 0.01) {
        const cosH = Math.cos(this.composition.handRotation);
        const sinH = Math.sin(this.composition.handRotation);
        const dxWorld = (dxHand * cosH - dyHand * sinH) * this.composition.handScale;
        const dyWorld = (dxHand * sinH + dyHand * cosH) * this.composition.handScale;
        toolNode.x(toolNode.x() + dxWorld);
        toolNode.y(toolNode.y() + dyWorld);
      }
    }

    // Foreground visibility toggle
    if (config.showForeground === false) {
      handFg.visible(false);
    } else {
      handFg.visible(true);
    }

    // Update debug overlay
    if (config.debug) {
      this.debugEnabled = true;
      const target = { x: config.pathPosition.x, y: config.pathPosition.y };
      const tip = { x: toolNode.x(), y: toolNode.y() };
      if (!this.dbg.tipCircle || !this.dbg.targetCircle || !this.dbg.errorLine) {
        // Create if missing
        this.dbg.targetCircle = new Konva.Circle({ x: target.x, y: target.y, radius: 3, fill: 'magenta', opacity: 0.9 });
        this.dbg.tipCircle = new Konva.Circle({ x: tip.x, y: tip.y, radius: 3, fill: 'lime', opacity: 0.9 });
        this.dbg.errorLine = new Konva.Line({ points: [target.x, target.y, tip.x, tip.y], stroke: 'orange', strokeWidth: 1, opacity: 0.7 });
        handGroup.add(this.dbg.errorLine);
        handGroup.add(this.dbg.targetCircle);
        handGroup.add(this.dbg.tipCircle);
      } else {
        this.dbg.targetCircle.position(target);
        this.dbg.tipCircle.position(tip);
        this.dbg.errorLine.points([target.x, target.y, tip.x, tip.y]);
        // Keep markers on top of images
        this.dbg.errorLine.moveToTop();
        this.dbg.targetCircle.moveToTop();
        this.dbg.tipCircle.moveToTop();
      }
    }
  }

  /**
   * Get the final tip position for path alignment verification (now includes any calibration)
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

    // Hand grip points (no additional offset needed - already in composition)
    const handGripCircle = new Konva.Circle({
      x: this.composition.handPosition.x,
      y: this.composition.handPosition.y,
      radius: 5,
      fill: 'red',
      opacity: 0.7
    });

    // Tool socket points (no additional offset needed - already in composition)
    const toolSocketCircle = new Konva.Circle({
      x: this.composition.toolPosition.x,
      y: this.composition.toolPosition.y,
      radius: 5,
      fill: 'blue',
      opacity: 0.7
    });

    // Final tip position (no additional offset needed - already in composition)
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
        this.composition.handPosition.x,
        this.composition.handPosition.y,
        this.composition.toolPosition.x,
        this.composition.toolPosition.y,
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
    this.baseNibInHand = null;
    this.baseNibCacheKey = null;
  }

  // Compute the default nib position (tip) in hand image coordinates
  // for the given handedness. Cached per renderer instance for current assets.
  private computeBaseNibInHand(hand: HandAsset, tool: ToolAsset): { x: number; y: number } {
    const key = `${hand.id}__${tool.id}`;
    if (this.baseNibInHand && this.baseNibCacheKey === key) return this.baseNibInHand;
    const comp = HandToolCompositor.composeHandTool(hand, tool, { x: 0, y: 0 }, 0, 1);
    const base = {
      x: comp.finalTipPosition.x - comp.handPosition.x,
      y: comp.finalTipPosition.y - comp.handPosition.y,
    };
    this.baseNibInHand = base;
    this.baseNibCacheKey = key;
    return base;
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
