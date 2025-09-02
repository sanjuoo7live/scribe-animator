import React, { useEffect, useMemo, useRef } from 'react';
import { Group } from 'react-konva';
import Konva from 'konva';
import { HandAsset, ToolAsset } from '../../types/handAssets';
import { ThreeLayerHandRenderer } from '../../utils/threeLayerHandRenderer';
import { PathSampler } from '../../utils/pathSampler';

interface Props {
  pathData: string;
  progress: number; // 0..1
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
  progress,
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

  const sampler = useMemo(() => {
    if (!pathData) return null;
    return PathSampler.createCachedSampler(pathData, 2);
  }, [pathData]);

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
      const renderer = new ThreeLayerHandRenderer();
      rendererRef.current = renderer;
      await renderer.loadAssets(handAsset, toolAsset);

      const p = sampler.getPointAtProgress(progress) || { x: 0, y: 0, tangentAngle: 0 };
      const group = renderer.createThreeLayerGroup({
        handAsset,
        toolAsset,
        pathPosition: { x: p.x, y: p.y },
        pathAngle: p.tangentAngle,
        scale: displayScale,
        opacity: 1,
        debug: false,
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
    };
  }, [sampler, handAsset, toolAsset, displayScale, visible, debug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update position on progress changes
  useEffect(() => {
    if (!rendererRef.current || !innerGroupRef.current || !sampler || !visible) return;
    const p = sampler.getPointAtProgress(progress);
    if (!p) return;
    rendererRef.current.updatePosition(innerGroupRef.current, {
      handAsset,
      toolAsset,
      pathPosition: { x: p.x, y: p.y },
      pathAngle: p.tangentAngle,
      scale: displayScale,
      opacity: 1,
      debug: false,
      mirror,
      showForeground,
      extraOffset,
    });
    mountRef.current?.getLayer()?.batchDraw();
  }, [progress, sampler, handAsset, toolAsset, displayScale, visible, debug, mirror, showForeground, extraOffset]);

  if (!visible) return null;
  return <Group ref={mountRef} />;
};

export default ThreeLayerHandFollower;
