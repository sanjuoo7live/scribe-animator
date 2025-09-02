import { HandAsset, ToolAsset, HandToolComposition, Point2D } from '../types/handAssets';

export class HandToolCompositor {
  
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
    
    // 1. Calculate tool transform to align tip with path position
    const toolTransform = this.calculateToolTransform(toolAsset, pathPosition, pathAngle, scale);
    
    // 2. Calculate hand transform to grip the tool properly
    const handTransform = this.calculateHandTransform(handAsset, toolAsset, toolTransform, scale);
    
    // 3. Compute final tip position (should match pathPosition)
    const finalTipPosition = this.computeFinalTipPosition(toolAsset, toolTransform);
    
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
   */
  private static calculateToolTransform(
    tool: ToolAsset,
    targetPosition: Point2D,
    targetAngle: number,
    scale: number
  ) {
    // Apply rotation offset if tool sprite is drawn off-axis
    const adjustedAngle = targetAngle + (tool.rotationOffsetDeg || 0) * Math.PI / 180;
    // Compute rotated tip anchor to place the top-left origin.
    // We want: position + R * tipAnchor * scale = targetPosition
    const cos = Math.cos(adjustedAngle);
    const sin = Math.sin(adjustedAngle);
    const rotatedTip = {
      x: tool.tipAnchor.x * cos - tool.tipAnchor.y * sin,
      y: tool.tipAnchor.x * sin + tool.tipAnchor.y * cos
    };
    const toolPosition = {
      x: targetPosition.x - rotatedTip.x * scale,
      y: targetPosition.y - rotatedTip.y * scale
    };
    
    return {
      position: toolPosition,
      rotation: adjustedAngle,
      scale
    };
  }
  
  /**
   * Calculate hand transformation to properly grip the tool
   */
  private static calculateHandTransform(
    hand: HandAsset,
    tool: ToolAsset,
    toolTransform: any,
    scale: number
  ) {
    // Calculate the grip alignment
    // Hand's grip direction vector
    const handGripVector = {
      x: hand.gripForward.x - hand.gripBase.x,
      y: hand.gripForward.y - hand.gripBase.y
    };
    
    // Tool's socket direction vector
    const toolSocketVector = {
      x: tool.socketForward.x - tool.socketBase.x,
      y: tool.socketForward.y - tool.socketBase.y
    };
    
    // Calculate angle between grip directions
    const handGripAngle = Math.atan2(handGripVector.y, handGripVector.x);
    const toolSocketAngle = Math.atan2(toolSocketVector.y, toolSocketVector.x);
    const alignmentAngle = toolTransform.rotation - (toolSocketAngle - handGripAngle);
    
    // Apply natural tilt if specified
    const finalHandRotation = alignmentAngle + (hand.naturalTiltDeg || 0) * Math.PI / 180;
    
    // Calculate hand position to align grip points
    // First, find where hand's grip point would be after rotation
    const cos = Math.cos(finalHandRotation);
    const sin = Math.sin(finalHandRotation);
    
    const rotatedGripOffset = {
      x: hand.gripBase.x * cos - hand.gripBase.y * sin,
      y: hand.gripBase.x * sin + hand.gripBase.y * cos
    };
    
    const scaledGripOffset = {
      x: rotatedGripOffset.x * scale,
      y: rotatedGripOffset.y * scale
    };
    
    // Tool's socket position in world coordinates
    const toolSocketWorldPos = {
      x: toolTransform.position.x + (tool.socketBase.x * Math.cos(toolTransform.rotation) - tool.socketBase.y * Math.sin(toolTransform.rotation)) * scale,
      y: toolTransform.position.y + (tool.socketBase.x * Math.sin(toolTransform.rotation) + tool.socketBase.y * Math.cos(toolTransform.rotation)) * scale
    };
    
    // Hand position = tool socket position - rotated grip offset
    const handPosition = {
      x: toolSocketWorldPos.x - scaledGripOffset.x,
      y: toolSocketWorldPos.y - scaledGripOffset.y
    };
    
    return {
      position: handPosition,
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
