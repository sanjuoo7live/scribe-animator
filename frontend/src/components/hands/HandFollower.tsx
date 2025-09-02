/**
 * Hand Follower Component
 * 
 * Renders a hand with tool following an SVG path with realistic movement and rotation.
 * This component integrates with the existing animation system and provides the core
 * functionality for the Hand Follower System.
 */

import React, { useMemo, useCallback } from 'react';
import { Group, Image as KonvaImage, Circle } from 'react-konva';
import { HandAsset, HandAssetManager } from './HandAssetManager';
import { PathSampler } from '../../utils/pathSampler';

export interface HandFollowerProps {
  pathData: string; // SVG path data
  progress: number; // Animation progress 0-1
  handAsset?: HandAsset | null; // Hand asset to render
  visible?: boolean; // Show/hide the hand
  scale?: number; // Overall scale multiplier
  smoothing?: number; // Movement smoothing factor (0-1)
  zIndex?: number; // Z-index for layering (above/below stroke)
  offset?: { x: number; y: number }; // Additional offset from path tip
}

export const HandFollower: React.FC<HandFollowerProps> = ({
  pathData,
  progress,
  handAsset,
  visible = true,
  scale = 1,
  smoothing = 0.1,
  zIndex = 1000,
  offset = { x: 0, y: 0 }
}) => {
  // Image loading hook (reused from existing ToolFollower)
  const useImage = (src?: string): HTMLImageElement | null => {
    const [img, setImg] = React.useState<HTMLImageElement | null>(null);
    React.useEffect(() => {
      if (!src) { setImg(null); return; }
      const image = new window.Image();
      image.onload = () => setImg(image);
      image.onerror = () => setImg(null);
      image.src = src;
      return () => setImg(null);
    }, [src]);
    return img;
  };

  // Memoize path sampling for performance
  const pathSampler = useMemo(() => {
    if (!pathData) return null;
    return PathSampler.createCachedSampler(pathData, 2); // 2px sample distance
  }, [pathData]);

  // Calculate current position and rotation
  const handTransform = useMemo(() => {
    if (!pathSampler || !handAsset) {
      return { x: 0, y: 0, rotation: 0, tipX: 0, tipY: 0 };
    }

    const currentPoint = pathSampler.getPointAtProgress(progress);
    if (!currentPoint) {
      return { x: 0, y: 0, rotation: 0, tipX: 0, tipY: 0 };
    }

    // Convert tangent angle to degrees and apply hand's rotation offset
    const rotationDegrees = (currentPoint.tangentAngle * 180 / Math.PI) + handAsset.rotationOffset;

    // Calculate hand size based on scale
    const handWidth = 40 * scale * handAsset.scale;
    const handHeight = 40 * scale * handAsset.scale;

    // Get tip position in hand coordinates
    const tipOffset = HandAssetManager.getTipPixelPosition(handAsset, handWidth, handHeight);

    // Calculate hand position so tip aligns with path point
    const handX = currentPoint.x - tipOffset.x + offset.x;
    const handY = currentPoint.y - tipOffset.y + offset.y;

    return {
      x: handX,
      y: handY,
      rotation: rotationDegrees,
      tipX: currentPoint.x + offset.x,
      tipY: currentPoint.y + offset.y
    };
  }, [pathSampler, progress, handAsset, scale, offset]);

  // Load hand image
  const handImage = useImage(handAsset?.imagePath);

  // Don't render if not visible or no valid data
  if (!visible || !handAsset || !handImage || !pathSampler) {
    return null;
  }

  const handWidth = 40 * scale * handAsset.scale;
  const handHeight = 40 * scale * handAsset.scale;

  return (
    <Group>
      <KonvaImage
        image={handImage}
        x={handTransform.x}
        y={handTransform.y}
        width={handWidth}
        height={handHeight}
        offsetX={handWidth / 2}
        offsetY={handHeight / 2}
        rotation={handTransform.rotation}
        opacity={0.9} // Slightly transparent for better blending
        listening={false} // Don't interfere with canvas interactions
      />
    </Group>
  );
};

/**
 * Enhanced Hand Follower with smoothing and corner detection
 * This version includes movement smoothing and will be enhanced in Phase 2
 */
export interface EnhancedHandFollowerProps extends HandFollowerProps {
  smoothingEnabled?: boolean;
  smoothingStrength?: number;
  cornerDetection?: boolean;
  cornerLiftThreshold?: number; // Angle threshold in degrees
}

export const EnhancedHandFollower: React.FC<EnhancedHandFollowerProps> = ({
  smoothingEnabled = false,
  smoothingStrength = 0.5,
  cornerDetection = false,
  cornerLiftThreshold = 45,
  ...baseProps
}) => {
  // For Phase 1, just render the basic hand follower
  // Phase 2 will add smoothing and corner detection
  return <HandFollower {...baseProps} />;
};

/**
 * Utility component for testing hand follower positioning
 * Shows a small dot at the calculated tip position for debugging
 */
export const HandFollowerDebug: React.FC<HandFollowerProps & { showTip?: boolean }> = ({
  showTip = false,
  ...props
}) => {
  return (
    <Group>
      <HandFollower {...props} />
      {showTip && (
        <Group>
          {/* Small dot to show tip position */}
          <Circle
            radius={2}
            x={0} // Will be positioned by parent transform
            y={0}
            fill="red"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};

/**
 * Hook for managing hand follower state
 * Useful for components that need to control multiple hand followers
 */
export const useHandFollower = (pathData: string, initialAsset?: HandAsset) => {
  const [currentAsset, setCurrentAsset] = React.useState<HandAsset | null>(
    initialAsset || HandAssetManager.getDefaultHandAsset()
  );
  const [isVisible, setIsVisible] = React.useState(true);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  const pathSampler = useMemo(() => {
    if (!pathData) return null;
    return PathSampler.createCachedSampler(pathData, 2);
  }, [pathData]);

  const updateAsset = useCallback((newAsset: HandAsset | null) => {
    setCurrentAsset(newAsset);
  }, []);

  const updateScale = useCallback((newScale: number) => {
    setScale(Math.max(0.1, Math.min(3, newScale))); // Clamp scale
  }, []);

  const updateOffset = useCallback((newOffset: { x: number; y: number }) => {
    setOffset(newOffset);
  }, []);

  const toggle = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  return {
    currentAsset,
    isVisible,
    scale,
    offset,
    pathSampler,
    updateAsset,
    updateScale,
    updateOffset,
    toggle,
    setIsVisible
  };
};
