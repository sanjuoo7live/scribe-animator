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
  nibAnchor?: { x: number; y: number }; // Tool tip position in hand image coordinates
  toolRotationOffsetDeg?: number; // visual-only rotation applied to tool sprite
  nibLock?: boolean;
  listening?: boolean; // whether the wrapper Konva group should listen to events
  // Optional: mount directly into a Konva Layer instead of returning a wrapper Group
  mountLayer?: Konva.Layer | null;
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
  nibAnchor,
  listening = false,
  mountLayer,
  toolRotationOffsetDeg,
  nibLock = true,
}) => {
  const mountRef = useRef<Konva.Group>(null);
  const innerGroupRef = useRef<Konva.Group | null>(null);
  const rendererRef = useRef<ThreeLayerHandRenderer | null>(null);
  const prevAngleRef = useRef<number | undefined>(undefined);
  const lastProgressRef = useRef<number>(-1);
  const lastUpdateTsRef = useRef<number>(0);
  const bootLoggedRef = useRef(false);

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
  // Only create the group and load assets when core inputs change (assets/path/visibility).
  // DO NOT depend on getFrenetFramePosition or pathMatrix here to avoid remount loops.
  useEffect(() => {
    // Defer until required inputs are present. Do not block on mountRef; we'll attach when available.
    if (!pathData || !handAsset || !toolAsset || !visible) return;
    let cancelled = false;
    const setup = async () => {
      HandToolCompositor.resetDebugState();
      const renderer = new ThreeLayerHandRenderer();
      rendererRef.current = renderer;
      if (!bootLoggedRef.current) {
        bootLoggedRef.current = true;
      }
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
        rawPathPosition: { x: p.x, y: p.y },
        pathAngle: angle,
        scale: displayScale,
        opacity: 1,
        debug,
        mirror,
        showForeground,
        // nibAnchor affects both tool pivot offset and compositor math
        nibAnchor,
        extraOffset: extraOffset,
        toolRotationOffsetDeg,
        nibLock,
      });
      if (cancelled) { group.destroy(); return; }
      innerGroupRef.current = group;

      const attach = () => {
        if (cancelled) return;
        if (mountLayer) {
          try {
            const st = mountLayer.getStage();
            if (!st) {
              // Stage not ready yet; retry next frame
              requestAnimationFrame(attach);
              return;
            }
            mountLayer.add(group);
            try { group.moveToTop(); } catch {}
            try { mountLayer.draw(); } catch {}
            try { mountLayer.batchDraw(); } catch {}
            try { st.draw(); } catch {}
            try { st.batchDraw(); } catch {}
            // Nudge one more paint on next frame to guarantee first-visibility
            requestAnimationFrame(() => { try { st.batchDraw(); } catch {} });
            console.log('🤚 [FOLLOWER BOOT] attached to overlay layer');
            return;
          } catch (err) {
            console.warn('🤚 [FOLLOWER BOOT] overlay attach failed; falling back to wrapper', err);
          }
        }
        if (mountRef.current) {
          mountRef.current.add(group);
          try { mountRef.current.moveToTop(); } catch {}
          const layer = mountRef.current.getLayer();
          try { layer?.draw(); } catch {}
          try { layer?.batchDraw(); } catch {}
          const st = mountRef.current.getStage();
          try { st?.draw(); } catch {}
          try { st?.batchDraw(); } catch {}
          requestAnimationFrame(() => { try { st?.batchDraw(); } catch {} });
          console.log('🤚 [FOLLOWER BOOT] attached to wrapper group');
          return;
        }
        // Ref not ready yet; try on next frame
        requestAnimationFrame(attach);
      };
      attach();
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
  }, [handAsset, toolAsset, pathData, visible, mountLayer]);
  // Only update position on progress and calibration changes
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
      rawPathPosition: { x: p.x, y: p.y },
      pathAngle: angle,
      scale: displayScale,
      opacity: 1,
      debug,
      mirror,
      showForeground,
      nibAnchor,
      extraOffset: extraOffset,
      toolRotationOffsetDeg,
      nibLock,
    });
    if (mountLayer) {
      try { innerGroupRef.current?.moveToTop(); } catch {}
      try { mountLayer.batchDraw(); } catch {}
      try { mountLayer.getStage()?.batchDraw(); } catch {}
    } else {
      try { mountRef.current?.moveToTop(); } catch {}
      try { mountRef.current?.getLayer()?.batchDraw(); } catch {}
      try { mountRef.current?.getStage()?.batchDraw(); } catch {}
    }
  }, [progress, tipBacktrackPx, handAsset, toolAsset, displayScale, visible, mirror, showForeground, extraOffset, pathData, nibAnchor, pathMatrix, mountLayer, debug]);

  if (!visible) return null;
  // Always render a local wrapper group as a safe fallback; when an external
  // mountLayer is provided we still attach the composed group there, leaving
  // this wrapper empty.
  return <Group ref={mountRef} listening={listening} />;
};

export default ThreeLayerHandFollower;
