import { HandAsset, ToolAsset, HandToolComposition, Point2D } from '../types/handAssets';

export class HandToolCompositor {
  private static lastAngle?: number;
  private static debugEnabled: boolean = false;
  private static normalizeAngle(angle: number) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
  static resetDebugState() {
    this.lastAngle = undefined;
  }
  static setDebugEnabled(enabled: boolean) {
    this.debugEnabled = enabled;
  }
  
  /**
   * Calculate the complete hand-tool composition for a given path position
   */
  static composeHandTool(
    handAsset: HandAsset,
    toolAsset: ToolAsset,
    pathPosition: Point2D,
    pathAngle: number,
    scale: number = 1.0
  ): HandToolComposition {
    
    // Debug large angle changes that might cause displacement
    const current = this.normalizeAngle(pathAngle);
    if (this.debugEnabled && this.lastAngle !== undefined) {
      const prev = this.normalizeAngle(this.lastAngle);
      let diff = current - prev;
      if (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;
      const absDiff = Math.abs(diff);
      if (absDiff > (120 * Math.PI) / 180) {
        console.log(`[HandToolCompositor] Large angle change: ${(absDiff * 180 / Math.PI).toFixed(1)}° at position (${pathPosition.x.toFixed(1)}, ${pathPosition.y.toFixed(1)})`);
      }
    }
    this.lastAngle = current;
    
    // 1. Calculate tool transform to align tip with path position
    const toolTransform = this.calculateToolTransform(toolAsset, pathPosition, pathAngle, scale);
    
    // 2. Calculate hand transform to grip the tool properly
    const handTransform = this.calculateHandTransform(handAsset, toolAsset, toolTransform, scale);
    
    // 3. Compute final tip position (should match pathPosition)
    const finalTipPosition = this.computeFinalTipPosition(toolAsset, toolTransform);

    // Diagnostics: measure actual tip error vs path target
    if (this.debugEnabled) {
      const dxErr = finalTipPosition.x - pathPosition.x;
      const dyErr = finalTipPosition.y - pathPosition.y;
      const err = Math.hypot(dxErr, dyErr);
      if (err > 0.75) {
        console.log(`[HandToolCompositor] Tip displacement ${err.toFixed(2)}px at (${pathPosition.x.toFixed(1)}, ${pathPosition.y.toFixed(1)})`);
      }
    }
    
    return {
      handAsset,
      toolAsset,
      handPosition: handTransform.position,
      handRotation: handTransform.rotation,
      handScale: handTransform.scale,
      toolPosition: toolTransform.position,
      toolRotation: toolTransform.rotation,
      toolScale: toolTransform.scale,
      finalTipPosition
    };
  }
  
  /**
   * Calculate tool transformation to place tip at target position with target angle
   * Uses tip-centric approach to ensure pen tip remains absolutely fixed
   */
  private static calculateToolTransform(
    tool: ToolAsset,
    targetPosition: Point2D,
    targetAngle: number,
    scale: number
  ) {
    // Apply rotation offset if tool sprite is drawn off-axis
    const adjustedAngle = targetAngle + (tool.rotationOffsetDeg || 0) * Math.PI / 180;
    
    // CRITICAL: Calculate tool position so that the tip anchor rotates around the target position
    // This ensures the tip stays exactly at targetPosition regardless of rotation
    const cos = Math.cos(adjustedAngle);
    const sin = Math.sin(adjustedAngle);
    
    // Transform tip anchor by rotation and scale
    const transformedTipX = tool.tipAnchor.x * cos - tool.tipAnchor.y * sin;
    const transformedTipY = tool.tipAnchor.x * sin + tool.tipAnchor.y * cos;
    
    // Tool origin position = target - transformed tip anchor
    const toolPosition = {
      x: targetPosition.x - transformedTipX * scale,
      y: targetPosition.y - transformedTipY * scale
    };
    
    // High precision to prevent drift during large rotations
    return {
      position: {
        x: Math.round(toolPosition.x * 10000) / 10000,
        y: Math.round(toolPosition.y * 10000) / 10000
      },
      rotation: adjustedAngle,
      scale
    };
  }
  
  /**
   * Calculate hand transformation to properly grip the tool
   * Ensures hand grips tool correctly while tool tip remains fixed
   */
  private static calculateHandTransform(
    hand: HandAsset,
    tool: ToolAsset,
    toolTransform: any,
    scale: number
  ) {
    // Calculate the grip alignment vectors
    const handGripVector = {
      x: hand.gripForward.x - hand.gripBase.x,
      y: hand.gripForward.y - hand.gripBase.y
    };
    
    const toolSocketVector = {
      x: tool.socketForward.x - tool.socketBase.x,
      y: tool.socketForward.y - tool.socketBase.y
    };
    
    // Calculate alignment angle between grip directions
    const handGripAngle = Math.atan2(handGripVector.y, handGripVector.x);
    const toolSocketAngle = Math.atan2(toolSocketVector.y, toolSocketVector.x);
    const alignmentAngle = toolTransform.rotation - (toolSocketAngle - handGripAngle);
    
    // Apply natural tilt if specified
    const finalHandRotation = alignmentAngle + (hand.naturalTiltDeg || 0) * Math.PI / 180;
    
    // High precision rotation calculations
    const cos = Math.cos(finalHandRotation);
    const sin = Math.sin(finalHandRotation);
    
    // Calculate where hand's grip point will be after rotation
    const rotatedGripOffset = {
      x: hand.gripBase.x * cos - hand.gripBase.y * sin,
      y: hand.gripBase.x * sin + hand.gripBase.y * cos
    };
    
    const scaledGripOffset = {
      x: rotatedGripOffset.x * scale,
      y: rotatedGripOffset.y * scale
    };
    
    // Calculate tool's socket position in world coordinates with high precision
    const toolCos = Math.cos(toolTransform.rotation);
    const toolSin = Math.sin(toolTransform.rotation);
    
    const toolSocketWorldPos = {
      x: toolTransform.position.x + (tool.socketBase.x * toolCos - tool.socketBase.y * toolSin) * scale,
      y: toolTransform.position.y + (tool.socketBase.x * toolSin + tool.socketBase.y * toolCos) * scale
    };
    
    // Hand position = tool socket position - rotated grip offset
    const handPosition = {
      x: toolSocketWorldPos.x - scaledGripOffset.x,
      y: toolSocketWorldPos.y - scaledGripOffset.y
    };
    
    // Ultra-high precision to prevent drift during large rotations
    return {
      position: {
        x: Math.round(handPosition.x * 10000) / 10000,
        y: Math.round(handPosition.y * 10000) / 10000
      },
      rotation: finalHandRotation,
      scale
    };
  }
  
  /**
   * Compute the final tip position after all transforms (for verification)
   */
  private static computeFinalTipPosition(tool: ToolAsset, toolTransform: any): Point2D {
    const cos = Math.cos(toolTransform.rotation);
    const sin = Math.sin(toolTransform.rotation);
    
    const rotatedTip = {
      x: tool.tipAnchor.x * cos - tool.tipAnchor.y * sin,
      y: tool.tipAnchor.x * sin + tool.tipAnchor.y * cos
    };
    
    return {
      x: toolTransform.position.x + rotatedTip.x * toolTransform.scale,
      y: toolTransform.position.y + rotatedTip.y * toolTransform.scale
    };
  }
  
  /**
   * Create a mirrored version of a hand asset (for left/right conversion)
   */
  static mirrorHandAsset(hand: HandAsset): HandAsset {
    if (!hand.mirrorable) {
      throw new Error(`Hand asset ${hand.id} is not mirrorable`);
    }
    
    return {
      ...hand,
      id: hand.id + "_mirrored",
      name: hand.name + " (Mirrored)",
      gripBase: { x: hand.sizePx.w - hand.gripBase.x, y: hand.gripBase.y },
      gripForward: { x: hand.sizePx.w - hand.gripForward.x, y: hand.gripForward.y },
      naturalTiltDeg: -(hand.naturalTiltDeg || 0)
    };
  }

  /**
   * Create a mirrored version of a tool asset (for left/right hand appearance)
   * Mirrors across the vertical axis of the image width.
   */
  static mirrorToolAsset(tool: ToolAsset): ToolAsset {
    return {
      ...tool,
      id: tool.id + "_mirrored",
      name: tool.name + " (Mirrored)",
      socketBase: { x: tool.sizePx.w - tool.socketBase.x, y: tool.socketBase.y },
      socketForward: { x: tool.sizePx.w - tool.socketForward.x, y: tool.socketForward.y },
      tipAnchor: { x: tool.sizePx.w - tool.tipAnchor.x, y: tool.tipAnchor.y },
      rotationOffsetDeg: -(tool.rotationOffsetDeg || 0)
    };
  }
  
  /**
   * Find the best hand-tool combination for a given drawing style
   */
  static suggestHandToolCombination(
    drawingStyle: 'precise' | 'sketchy' | 'artistic' | 'calligraphy',
    handedness: 'left' | 'right' | 'auto'
  ): { handId: string; toolId: string } {
    const suggestions = {
      precise: { hand: 'hand_right_pen_grip', tool: 'pen_blue_ballpoint' },
      sketchy: { hand: 'hand_right_pen_grip', tool: 'pencil_2h' },
      artistic: { hand: 'hand_right_brush_grip', tool: 'brush_flat_12' },
      calligraphy: { hand: 'hand_right_pen_grip', tool: 'marker_black_chisel' }
    };
    
    const base = suggestions[drawingStyle];
    
    if (handedness === 'left') {
      return {
        handId: base.hand.replace('right', 'left'),
        toolId: base.tool
      };
    }
    
    return {
      handId: base.hand,
      toolId: base.tool
    };
  }
}
