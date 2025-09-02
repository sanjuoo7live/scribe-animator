import React, { useEffect, useMemo, useRef } from 'react';
import { Group } from 'react-konva';
import Konva from 'konva';
import { HandAsset, ToolAsset } from '../../types/handAssets';
import { ThreeLayerHandRenderer } from '../../utils/threeLayerHandRenderer';
import { PathSampler } from '../../utils/pathSampler';
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

  const sampler = useMemo(() => {
    if (!pathData) return null;
    // Use step=2px and cap samples to 4000 for perf; still smooth with angle smoothing
    return PathSampler.createCachedSampler(pathData, 2, pathMatrix, 4000);
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
  // Initialize assets and group once for given assets/sampler; progress updates handled separately.
  // We intentionally exclude `progress` from deps to avoid reinitialization on every frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // We intentionally don't include `progress` in deps to avoid reinitialization every frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mountRef.current || !sampler || !handAsset || !toolAsset || !visible) return;

    let cancelled = false;
    const setup = async () => {
      // Reset compositor debug state for fresh run
  HandToolCompositor.resetDebugState();
  HandToolCompositor.setDebugEnabled(!!debug);
      const renderer = new ThreeLayerHandRenderer();
      rendererRef.current = renderer;
      await renderer.loadAssets(handAsset, toolAsset);

      // Avoid exactly 0 to prevent degenerate tangents
      const initProg = progress <= 0 ? 0.0001 : progress;
      let p = sampler.getPointAtProgress(initProg) || { x: 0, y: 0, tangentAngle: 0 } as any;
      if (tipBacktrackPx > 0) {
        const total = sampler.getTotalLength();
        const targetLen = Math.max(0, Math.min(total, initProg * total - tipBacktrackPx));
        const backProg = total > 0 ? targetLen / total : initProg;
        const bp = sampler.getPointAtProgress(backProg);
        if (bp) p = bp;
      }
      const angle = smoothAngle(prevAngleRef.current, p.tangentAngle);
      prevAngleRef.current = angle;
      const group = renderer.createThreeLayerGroup({
        handAsset,
        toolAsset,
        pathPosition: { x: p.x, y: p.y },
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

      // Optional initial drift log
      if (debug) {
        const tip = renderer.getTipPosition();
        if (tip) {
          const err = Math.hypot(tip.x - p.x, tip.y - p.y);
          if (err > 0.75) {
            console.log(`[HandFollower] Tip drift ${err.toFixed(2)}px at init (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
          }
        }
      }
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
  }, [sampler, handAsset, toolAsset, displayScale, visible, debug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update position on progress changes
  useEffect(() => {
    if (!rendererRef.current || !innerGroupRef.current || !sampler || !visible) return;
    // Simple throttle: cap at ~60fps
    const now = performance.now();
    if (now - lastUpdateTsRef.current < 16) return;
    lastUpdateTsRef.current = now;
    // Avoid exactly 0 to prevent degenerate tangents on some paths
    const currentProgress = progress <= 0 ? 0.0001 : progress;
    let p = sampler.getPointAtProgress(currentProgress);
    if (!p) return;
    if (tipBacktrackPx > 0) {
      const total = sampler.getTotalLength();
      const targetLen = Math.max(0, Math.min(total, currentProgress * total - tipBacktrackPx));
      const backProg = total > 0 ? targetLen / total : currentProgress;
      const bp = sampler.getPointAtProgress(backProg);
      if (bp) p = bp;
    }
    // Reset smoothing if progress resets or jumps backwards (new segment)
    if (currentProgress < lastProgressRef.current) {
      prevAngleRef.current = undefined;
    }
    lastProgressRef.current = currentProgress;
    const angle = smoothAngle(prevAngleRef.current, p.tangentAngle);
    prevAngleRef.current = angle;
    rendererRef.current.updatePosition(innerGroupRef.current, {
      handAsset,
      toolAsset,
      pathPosition: { x: p.x, y: p.y },
  pathAngle: angle,
      scale: displayScale,
      opacity: 1,
      debug,
      mirror,
      showForeground,
      extraOffset,
    });
    // Frame drift measurement
    if (debug) {
      const tip = rendererRef.current.getTipPosition();
      if (tip) {
        const err = Math.hypot(tip.x - p.x, tip.y - p.y);
        if (err > 0.75) {
          console.log(`[HandFollower] Tip drift ${err.toFixed(2)}px at (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
        }
      }
    }
  // Avoid excessive batchDraw calls; rely on Konva’s internal batching
  mountRef.current?.getLayer()?.batchDraw();
  }, [progress, sampler, handAsset, toolAsset, displayScale, visible, debug, mirror, showForeground, extraOffset, tipBacktrackPx]);

  if (!visible) return null;
  return <Group ref={mountRef} />;
};

export default ThreeLayerHandFollower;
