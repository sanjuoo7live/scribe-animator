// Animation utilities for Konva-based animations
export type AnimationType = 'none' | 'fadeIn' | 'slideIn' | 'scaleIn' | 'drawIn' | 'pathFollow' | 'typewriter';
export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

// Easing functions
export const easingFunctions = {
  linear: (t: number): number => t,
  easeIn: (t: number): number => t * t,
  easeOut: (t: number): number => 1 - Math.pow(1 - t, 2),
  easeInOut: (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

// Calculate animation progress based on current time
export const calculateAnimationProgress = (
  currentTime: number,
  animationStart: number = 0,
  animationDuration: number = 5,
  animationEasing: EasingType = 'easeOut'
): number => {
  const elapsed = Math.min(Math.max(currentTime - animationStart, 0), animationDuration);
  const rawProgress = animationDuration > 0 ? elapsed / animationDuration : 1;
  return easingFunctions[animationEasing](rawProgress);
};

// Get animated properties based on animation type
export const getAnimatedProperties = (
  obj: any,
  progress: number,
  animationType: AnimationType
): any => {
  const animatedProps: any = {};

  switch (animationType) {
    case 'fadeIn':
      animatedProps.opacity = progress;
      break;
    case 'scaleIn':
      // Don't apply scaleIn animation to SVG objects
      if (obj.type !== 'svgPath') {
        animatedProps.scaleX = progress;
        animatedProps.scaleY = progress;
      }
      break;
    case 'slideIn':
      animatedProps.x = obj.x + (1 - progress) * 100;
      animatedProps.y = obj.y;
      break;
    case 'drawIn':
      // For SVG objects, only apply opacity animation (no scaling)
      // For other objects, apply both opacity and scale animation
      if (obj.type === 'svgPath') {
        animatedProps.opacity = progress;
      } else {
        animatedProps.opacity = progress;
        animatedProps.scaleX = 0.3 + (progress * 0.7); // Start small and grow
        animatedProps.scaleY = 0.3 + (progress * 0.7);
      }
      break;
    case 'typewriter':
      // For non-text elements, treat typewriter as a progressive reveal via opacity
      // Text-specific typewriter is handled in TextRenderer via getTypewriterText
      if (obj.type !== 'text') {
        animatedProps.opacity = progress;
      }
      break;
    case 'pathFollow':
      if (obj.properties?.pathPoints && Array.isArray(obj.properties.pathPoints)) {
        const pathPoints = obj.properties.pathPoints;
        const totalPoints = pathPoints.length;
        if (totalPoints > 1) {
          const pathProgress = progress * (totalPoints - 1);
          const currentIndex = Math.floor(pathProgress);
          const nextIndex = Math.min(currentIndex + 1, totalPoints - 1);
          const segmentProgress = pathProgress - currentIndex;

          const currentPoint = pathPoints[currentIndex];
          const nextPoint = pathPoints[nextIndex];

          // Interpolate position along the path
          animatedProps.x = currentPoint.x + (nextPoint.x - currentPoint.x) * segmentProgress;
          animatedProps.y = currentPoint.y + (nextPoint.y - currentPoint.y) * segmentProgress;

          // Calculate rotation if enabled
          if (obj.properties?.rotateWithPath) {
            const dx = nextPoint.x - currentPoint.x;
            const dy = nextPoint.y - currentPoint.y;
            animatedProps.rotation = Math.atan2(dy, dx) * (180 / Math.PI);
          }
        }
      }
      break;
    default:
      // No animation
      break;
  }

  return animatedProps;
};

// Typewriter animation helper
export const getTypewriterText = (
  fullText: string,
  currentTime: number,
  animationStart: number = 0,
  animationDuration: number = 2
): string => {
  const elapsed = Math.min(Math.max(currentTime - animationStart, 0), animationDuration);
  const progress = animationDuration > 0 ? elapsed / animationDuration : 1;
  const total = fullText.length;
  const visibleCount = Math.max(0, Math.floor(progress * total + 0.00001));
  return fullText.slice(0, visibleCount);
};

// Draw path animation helper
export const getDrawPathSegments = (
  segments: { x: number; y: number }[][],
  progress: number
): { x: number; y: number }[][] => {
  const totalPoints = segments.reduce((sum, seg) => sum + seg.length, 0);
  const globalReveal = totalPoints > 1 ? Math.max(1, Math.floor(progress * totalPoints + 0.00001)) : totalPoints;

  let remaining = globalReveal;
  return segments.map((seg) => {
    if (remaining <= 0) return seg.slice(0, 0);
    const take = Math.min(seg.length, remaining);
    remaining -= take;
    return seg.slice(0, Math.max(1, take));
  });
};

// Get the current head point for tool follower
export const getDrawPathHead = (
  revealedSegments: { x: number; y: number }[][]
): { x: number; y: number } | null => {
  for (let i = revealedSegments.length - 1; i >= 0; i--) {
    const seg = revealedSegments[i];
    if (seg.length > 0) return seg[seg.length - 1];
  }
  return null;
};

// Calculate angle for tool follower
export const calculateToolAngle = (
  head: { x: number; y: number },
  prev: { x: number; y: number } | null
): number => {
  if (!prev) return 0;
  const dx = head.x - prev.x;
  const dy = head.y - prev.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
};

// DrawIn animation for text - reveals characters progressively
export const getDrawInText = (
  fullText: string,
  currentTime: number,
  animationStart: number = 0,
  animationDuration: number = 5,
  animationEasing: EasingType = 'easeOut'
): string => {
  const progress = calculateAnimationProgress(
    currentTime,
    animationStart,
    animationDuration,
    animationEasing
  );
  
  const total = fullText.length;
  const visibleCount = Math.max(0, Math.floor(progress * total + 0.00001));
  return fullText.slice(0, visibleCount);
};
