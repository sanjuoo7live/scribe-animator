import React, { useEffect, useMemo, useRef } from 'react';
import { Group } from 'react-konva';
import Konva from 'konva';
import { HandAsset, ToolAsset } from '../../types/handAssets';
import { ThreeLayerHandRenderer } from '../../utils/threeLayerHandRenderer';
import { HandToolCompositor } from '../../utils/handToolCompositor';

interface Props {
  pathData: string;
  pathMatrix?: number[];
  progress: number; // 0..1
  tipBacktrackPx?: number; // move slightly back along the path to align with visible stroke end
  handAsset: HandAsset;
  toolAsset: ToolAsset;
  scale?: number;
  visible?: boolean;
  debug?: boolean;
  mirror?: boolean;
  showForeground?: boolean;
  extraOffset?: { x: number; y: number };
}

// React wrapper that mounts a Konva group composed by ThreeLayerHandRenderer
const ThreeLayerHandFollower: React.FC<Props> = ({
  pathData,
  pathMatrix,
  progress,
  tipBacktrackPx = 0,
  handAsset,
  toolAsset,
  scale = 1,
  visible = true,
  debug = false,
  mirror = false,
  showForeground = true,
  extraOffset,
}) => {
  const mountRef = useRef<Konva.Group>(null);
  const innerGroupRef = useRef<Konva.Group | null>(null);
  const rendererRef = useRef<ThreeLayerHandRenderer | null>(null);
  const prevAngleRef = useRef<number | undefined>(undefined);
  const lastProgressRef = useRef<number>(-1);
  const lastUpdateTsRef = useRef<number>(0);

  const smoothAngle = (prev: number | undefined, next: number, factor = 0.35) => {
    if (prev === undefined) return next;
    // Normalize to [-pi, pi]
    const norm = (a: number) => {
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      return a;
    };
    let a1 = norm(prev);
    let a2 = norm(next);
    let diff = a2 - a1;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    const smoothed = a1 + diff * factor;
    return norm(smoothed);
  };

  // Get position and angle using Frenet frame (direct arc-length calculation)
  const getFrenetFramePosition = React.useCallback((progress: number, backtrackPx: number = 0) => {
    if (!pathData) return { x: 0, y: 0, tangentAngle: 0 };

    // Create temporary DOM path element for precise arc-length calculation
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.left = '-99999px';
    
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    document.body.appendChild(svg);

    try {
      const totalLength = path.getTotalLength();
      if (!isFinite(totalLength) || totalLength <= 0) {
        document.body.removeChild(svg);
        return { x: 0, y: 0, tangentAngle: 0 };
      }

      // Arc-length positioning: L = progress * totalLength
      let targetLength = Math.max(0, progress * totalLength - backtrackPx);
      targetLength = Math.min(targetLength, totalLength);

      // Get position directly from path geometry
      const point = path.getPointAtLength(targetLength);
      
      // Calculate tangent angle using epsilon method for smoothness
      const epsilon = Math.min(1, totalLength * 0.001); // Small step for tangent
      const backPoint = path.getPointAtLength(Math.max(0, targetLength - epsilon));
      const forwardPoint = path.getPointAtLength(Math.min(totalLength, targetLength + epsilon));
      
      let tangentAngle = Math.atan2(forwardPoint.y - backPoint.y, forwardPoint.x - backPoint.x);

      // Apply matrix transformation if provided
      let finalPoint = { x: point.x, y: point.y };
      if (pathMatrix && pathMatrix.length >= 6) {
        const [a, b, c, d, e, f] = pathMatrix;
        finalPoint = {
          x: a * point.x + c * point.y + e,
          y: b * point.x + d * point.y + f,
        };
        
        // Transform tangent direction as well
        const dx = forwardPoint.x - backPoint.x;
        const dy = forwardPoint.y - backPoint.y;
        const transformedDx = a * dx + c * dy;
        const transformedDy = b * dx + d * dy;
        tangentAngle = Math.atan2(transformedDy, transformedDx);
      }

      document.body.removeChild(svg);
      return { ...finalPoint, tangentAngle };
      
    } catch (error) {
      document.body.removeChild(svg);
      return { x: 0, y: 0, tangentAngle: 0 };
    }
  }, [pathData, pathMatrix]);

  // Normalize visual size: scale tool to a target tip length (pixels)
  const displayScale = useMemo(() => {
    const targetLenPx = 180; // visually comfortable default size
    const dx = toolAsset.socketForward.x - toolAsset.tipAnchor.x;
    const dy = toolAsset.socketForward.y - toolAsset.tipAnchor.y;
    const toolLen = Math.max(1, Math.hypot(dx, dy));
    const base = targetLenPx / toolLen;
    return (scale ?? 1) * base;
  }, [toolAsset, scale]);

  // Initialize assets and add inner group once
  // Initialize assets and add inner group once
  // Only create the group and load assets when pathData, handAsset, or toolAsset changes
  useEffect(() => {
    if (!mountRef.current || !pathData || !handAsset || !toolAsset || !visible) return;
    let cancelled = false;
    const setup = async () => {
      HandToolCompositor.resetDebugState();
      const renderer = new ThreeLayerHandRenderer();
      rendererRef.current = renderer;
      await renderer.loadAssets(handAsset, toolAsset);
      // Initial position
      const initProg = progress <= 0 ? 0.0001 : progress;
      const p = getFrenetFramePosition(initProg, tipBacktrackPx);
      const angle = smoothAngle(prevAngleRef.current, p.tangentAngle);
      prevAngleRef.current = angle;
      let posX = p.x, posY = p.y;
      if (extraOffset && (extraOffset.x || extraOffset.y)) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = (extraOffset.x || 0) * cos - (extraOffset.y || 0) * sin;
        const dy = (extraOffset.x || 0) * sin + (extraOffset.y || 0) * cos;
        posX += dx; posY += dy;
      }
      const group = renderer.createThreeLayerGroup({
        handAsset,
        toolAsset,
        pathPosition: { x: posX, y: posY },
        pathAngle: angle,
        scale: displayScale,
        opacity: 1,
        debug,
        mirror,
        showForeground,
        extraOffset,
      });
      if (cancelled) { group.destroy(); return; }
      innerGroupRef.current = group;
      mountRef.current!.add(group);
      mountRef.current!.getLayer()?.batchDraw();
    };
    setup();
    return () => {
      cancelled = true;
      if (innerGroupRef.current) {
        innerGroupRef.current.destroy();
        innerGroupRef.current = null;
      }
      rendererRef.current?.dispose();
      rendererRef.current = null;
      prevAngleRef.current = undefined;
    };
  }, [getFrenetFramePosition, handAsset, toolAsset, displayScale, visible, mirror, showForeground, pathData]);
  // Only update position on progress changes
  useEffect(() => {
    if (!rendererRef.current || !innerGroupRef.current || !pathData || !visible) return;
    const currentProgress = progress <= 0 ? 0.0001 : progress;
    const p = getFrenetFramePosition(currentProgress, tipBacktrackPx);
    if (!p) return;
    if (currentProgress < lastProgressRef.current) {
      prevAngleRef.current = undefined;
    }
    lastProgressRef.current = currentProgress;
    const angle = smoothAngle(prevAngleRef.current, p.tangentAngle);
    prevAngleRef.current = angle;
    let posX = p.x, posY = p.y;
    if (extraOffset && (extraOffset.x || extraOffset.y)) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dx = (extraOffset.x || 0) * cos - (extraOffset.y || 0) * sin;
      const dy = (extraOffset.x || 0) * sin + (extraOffset.y || 0) * cos;
      posX += dx; posY += dy;
    }
    rendererRef.current.updatePosition(innerGroupRef.current, {
      handAsset,
      toolAsset,
      pathPosition: { x: posX, y: posY },
      pathAngle: angle,
      scale: displayScale,
      opacity: 1,
      debug,
      mirror,
      showForeground,
      extraOffset,
    });
    mountRef.current?.getLayer()?.batchDraw();
  }, [progress, tipBacktrackPx, handAsset, toolAsset, displayScale, visible, mirror, showForeground, extraOffset, pathData]);

  if (!visible) return null;
  return <Group ref={mountRef} />;
};

export default ThreeLayerHandFollower;
