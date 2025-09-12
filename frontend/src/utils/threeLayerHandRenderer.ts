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
  // Extra visual rotation in degrees applied to the tool sprite only.
  // This does NOT affect composition math; nib stays locked and hand position does not change.
  toolRotationOffsetDeg?: number;
  // For debug only: raw path position before applying any Frenet extraOffset
  rawPathPosition?: { x: number; y: number };
  nibLock?: boolean;
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
  private lastScale: number | undefined;
  private lastExtraOffset: { x: number; y: number } | undefined;

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
    // Map nibAnchor in hand space to a custom tip anchor in tool space
    let customTip: { x: number; y: number } | undefined;
    if (config.nibAnchor) {
      const baseNib = this.computeBaseNibInHand(handForCalc, toolForCalc);
      const nibInHand = config.mirror
        ? { x: handForCalc.sizePx.w - config.nibAnchor.x, y: config.nibAnchor.y }
        : config.nibAnchor;
      const dxH = nibInHand.x - baseNib.x;
      const dyH = nibInHand.y - baseNib.y;
      if (Math.abs(dxH) + Math.abs(dyH) > 0.001) {
        const base = HandToolCompositor.composeHandTool(handForCalc, toolForCalc, { x: 0, y: 0 }, 0, 1);
        const rel = base.toolRotation - base.handRotation;
        const cosR = Math.cos(rel), sinR = Math.sin(rel);
        const dtX = dxH * cosR - dyH * sinR;
        const dtY = dxH * sinR + dyH * cosR;
        customTip = { x: toolForCalc.tipAnchor.x + dtX, y: toolForCalc.tipAnchor.y + dtY };
      }
    }
    this.composition = HandToolCompositor.composeHandTool(
      handForCalc,
      toolForCalc,
      config.pathPosition,
      config.pathAngle,
      config.scale,
      customTip
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
    // Rotate visually around the TOOL CENTER, but compensate position so the tip stays locked.
    const centerX = config.toolAsset.sizePx.w / 2;
    const centerY = config.toolAsset.sizePx.h / 2;
    const vx = config.toolAsset.tipAnchor.x - centerX;
    const vy = config.toolAsset.tipAnchor.y - centerY;
    const extraDeg = config.toolRotationOffsetDeg || 0;
    // Determine whether to lock nib (total rotation) or center-only baseline
    const baseRot = (toolRotDeg * Math.PI) / 180;
    const totalRot = ((toolRotDeg + extraDeg) * Math.PI) / 180;
    const sx = this.composition.toolScale * (config.mirror ? -1 : 1);
    const sy = this.composition.toolScale;
    const cosUse = config.nibLock ? Math.cos(totalRot) : Math.cos(baseRot);
    const sinUse = config.nibLock ? Math.sin(totalRot) : Math.sin(baseRot);
    // Transform center->tip vector with Scale(mirror) then chosen rotation
    const ux = (vx * sx) * cosUse - (vy * sy) * sinUse;
    const uy = (vx * sx) * sinUse + (vy * sy) * cosUse;
    let posX = this.composition.finalTipPosition.x - ux;
    let posY = this.composition.finalTipPosition.y - uy;

    const toolNode = new Konva.Image({
      image: this.toolImage,
      x: posX,
      y: posY,
      rotation: toolRotDeg + extraDeg,
      scaleX: sx,
      scaleY: sy,
      // Pivot around the CENTER so extra rotation is about center of gravity
      offsetX: centerX,
      offsetY: centerY,
    });

    // No post-nudge; nibAnchor is baked into composition via custom tip

    // Final re-pin: compute actual tip from node after all adjustments and force it to target
    const computeTip = (): {x:number;y:number} => {
      const rot = (toolNode.rotation() * Math.PI) / 180;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const sX = toolNode.scaleX();
      const sY = toolNode.scaleY();
      const vX = config.toolAsset.tipAnchor.x - centerX;
      const vY = config.toolAsset.tipAnchor.y - centerY;
      return {
        x: toolNode.x() + (vX * sX) * cos - (vY * sY) * sin,
        y: toolNode.y() + (vX * sX) * sin + (vY * sY) * cos,
      };
    };
    {
      const actual = computeTip();
      const desired = this.composition.finalTipPosition; // already equals pathPosition
      const dx = actual.x - desired.x;
      const dy = actual.y - desired.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.001) {
        toolNode.x(toolNode.x() - dx);
        toolNode.y(toolNode.y() - dy);
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

    // Optional debug overlay (render only when debug is on)
    this.debugEnabled = !!config.debug;
    if (this.debugEnabled) {
      // Use actual pathPosition as the target (includes any Frenet extraOffset)
      const target = { x: config.pathPosition.x, y: config.pathPosition.y };
      // Use actual tip (derived from node transform) for accurate debugging
      const rot = (toolNode.rotation() * Math.PI) / 180;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const vX = config.toolAsset.tipAnchor.x - (config.toolAsset.sizePx.w / 2);
      const vY = config.toolAsset.tipAnchor.y - (config.toolAsset.sizePx.h / 2);
      const tip = {
        x: toolNode.x() + (vX * toolNode.scaleX()) * cos - (vY * toolNode.scaleY()) * sin,
        y: toolNode.y() + (vX * toolNode.scaleX()) * sin + (vY * toolNode.scaleY()) * cos,
      };
      const errPts = [target.x, target.y, tip.x, tip.y];
      this.dbg.targetCircle = new Konva.Circle({ x: target.x, y: target.y, radius: 3, fill: 'magenta', opacity: 0.9 });
      this.dbg.tipCircle = new Konva.Circle({ x: tip.x, y: tip.y, radius: 3, fill: 'lime', opacity: 0.9 });
      this.dbg.errorLine = new Konva.Line({ points: errPts, stroke: 'orange', strokeWidth: 1, opacity: 0.7 });
      handGroup.add(this.dbg.errorLine);
      handGroup.add(this.dbg.targetCircle);
      handGroup.add(this.dbg.tipCircle);
      // Logs are handled in update only to reduce noise
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
    // Recalculate composition (include nibAnchor as custom tip so hand stays gripping the tool)
    const toolForCalc2 = (config.mirror ? HandToolCompositor.mirrorToolAsset(config.toolAsset) : config.toolAsset);
    let customTip2: { x: number; y: number } | undefined;
    if (config.nibAnchor) {
      const baseNib = this.computeBaseNibInHand(handForCalc, toolForCalc2);
      const nibInHand = config.mirror
        ? { x: handForCalc.sizePx.w - config.nibAnchor.x, y: config.nibAnchor.y }
        : config.nibAnchor;
      const dxH = nibInHand.x - baseNib.x;
      const dyH = nibInHand.y - baseNib.y;
      if (Math.abs(dxH) + Math.abs(dyH) > 0.001) {
        const base = HandToolCompositor.composeHandTool(handForCalc, toolForCalc2, { x: 0, y: 0 }, 0, 1);
        const rel = base.toolRotation - base.handRotation;
        const cosR = Math.cos(rel), sinR = Math.sin(rel);
        const dtX = dxH * cosR - dyH * sinR;
        const dtY = dxH * sinR + dyH * cosR;
        customTip2 = { x: toolForCalc2.tipAnchor.x + dtX, y: toolForCalc2.tipAnchor.y + dtY };
      }
    }
    this.composition = HandToolCompositor.composeHandTool(
      handForCalc,
      toolForCalc2,
      config.pathPosition,
      config.pathAngle,
      config.scale,
      customTip2
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

    // Update tool: rotate about CENTER and compensate so the tip remains locked
    // Match the logic used in createThreeLayerGroup so behavior is identical
    const extraDeg = config.toolRotationOffsetDeg || 0;
    const baseRot = this.composition.toolRotation; // radians
    const totalRot = baseRot + (extraDeg * Math.PI) / 180; // radians
    const centerX = config.toolAsset.sizePx.w / 2;
    const centerY = config.toolAsset.sizePx.h / 2;
    const vx = config.toolAsset.tipAnchor.x - centerX;
    const vy = config.toolAsset.tipAnchor.y - centerY;
    const sx = this.composition.toolScale * (config.mirror ? -1 : 1);
    const sy = this.composition.toolScale;
    // If nib is locked, compensate using the total rotation so the tip stays pinned
    const useRot = config.nibLock ? totalRot : baseRot;
    const cosUse = Math.cos(useRot);
    const sinUse = Math.sin(useRot);
    const ux = (vx * sx) * cosUse - (vy * sy) * sinUse;
    const uy = (vx * sx) * sinUse + (vy * sy) * cosUse;
    let posX = this.composition.finalTipPosition.x - ux;
    let posY = this.composition.finalTipPosition.y - uy;
    toolNode.setAttrs({
      x: posX,
      y: posY,
      rotation: (baseRot * 180) / Math.PI + extraDeg,
      scaleX: sx,
      scaleY: sy,
      offsetX: centerX,
      offsetY: centerY,
    });

    // No post-nudge; nibAnchor already baked into composition

    // Final re-pin: ensure actual tip equals desired path target after all adjustments
    const computeTip = (): { x: number; y: number } => {
      const rot = (toolNode.rotation() * Math.PI) / 180;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const sX = toolNode.scaleX();
      const sY = toolNode.scaleY();
      const vX = config.toolAsset.tipAnchor.x - centerX;
      const vY = config.toolAsset.tipAnchor.y - centerY;
      return {
        x: toolNode.x() + (vX * sX) * cos - (vY * sY) * sin,
        y: toolNode.y() + (vX * sX) * sin + (vY * sY) * cos,
      };
    };
    {
      const desired = this.composition.finalTipPosition;
      const actual = computeTip();
      const dx = actual.x - desired.x;
      const dy = actual.y - desired.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.005) {
        toolNode.x(toolNode.x() - dx);
        toolNode.y(toolNode.y() - dy);
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
      // Use actual pathPosition as the target (includes any Frenet extraOffset)
      const target = { x: config.pathPosition.x, y: config.pathPosition.y };
      const rotT = (toolNode.rotation() * Math.PI) / 180;
      const cosT = Math.cos(rotT), sinT = Math.sin(rotT);
      const vX2 = config.toolAsset.tipAnchor.x - (config.toolAsset.sizePx.w / 2);
      const vY2 = config.toolAsset.tipAnchor.y - (config.toolAsset.sizePx.h / 2);
      const tip = {
        x: toolNode.x() + (vX2 * toolNode.scaleX()) * cosT - (vY2 * toolNode.scaleY()) * sinT,
        y: toolNode.y() + (vX2 * toolNode.scaleX()) * sinT + (vY2 * toolNode.scaleY()) * cosT,
      };
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

      // Log when scale or offset changes, and also log error magnitude
      const ex = config.extraOffset || { x: 0, y: 0 };
      const scaleChanged = this.lastScale !== config.scale;
      if (scaleChanged) {
        try {
          console.log('🧭 [DRIFT DEBUG:update]', {
            scale: config.scale,
            mirror: !!config.mirror,
            extraOffset: ex,
            tip,
            target,
            note: 'scale changed'
          });
        } catch {}
        this.lastScale = config.scale;
      }
    }
    else {
      // Hide overlay entirely when debug is off
      if (this.dbg.errorLine) this.dbg.errorLine.visible(false);
      if (this.dbg.targetCircle) this.dbg.targetCircle.visible(false);
      if (this.dbg.tipCircle) this.dbg.tipCircle.visible(false);
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
