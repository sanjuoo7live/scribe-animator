import React from 'react';
import { Group, Rect, Shape } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';
import { calculateAnimationProgress } from '../utils/animationUtils';
import ThreeLayerHandFollower from '../../hands/ThreeLayerHandFollower';
import { getPath2D, getPathTotalLength, buildHandLUTTransformedAsync, HandLUT, samplesToLut } from '../../../utils/pathCache';
import type { ParsedPath } from '../../../types/parsedPath';
import { useCanvasContextOptional } from '../../canvas';
// Note: renderer reads handFollower settings from obj.properties.handFollower

// PHASE0: internal extension with cached fields
interface CachedParsedPath extends ParsedPath {
  _samples?: any; // PathPoint[] | Float32Array
  _lut?: HandLUT | null;
}

// Note: splitSubpaths no longer used in this renderer

function samplePoseByS(lut: HandLUT | null, s: number) {
  if (!lut || lut.len <= 0) return null;
  let lo = 0, hi = lut.points.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (lut.points[mid].s < s) lo = mid; else hi = mid;
  }
  const a = lut.points[lo], b = lut.points[hi];
  const t = (s - a.s) / Math.max(1e-6, (b.s - a.s));
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    theta: a.theta + t * (b.theta - a.theta),
  };
}

const applyTransformContext = (
  ctx: any,
  m: number[] | undefined,
  fn: () => void
) => {
  ctx.save();
  if (m && m.length >= 6) ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  fn();
  ctx.restore();
};

// SVG Path Renderer component
export const SvgPathRenderer: React.FC<BaseRendererProps> = ({
  obj,
  animatedProps,
  currentTime,
  isSelected,
  tool,
  onClick,
  onDragEnd,
  onDragMove,
  onTransformEnd,
}) => {
  const canvasCtx = useCanvasContextOptional();
  // Overlay layer (Konva) if available
  const overlayLayer = canvasCtx?.overlayLayerRef?.current || null;

  // Ensure rerender during playback by subscribing to the canvas clock
  const [clockTick, setClockTick] = React.useState(0);
  const lastScaleRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!canvasCtx?.clock) return;
    const unsubscribe = canvasCtx.clock.subscribe(() => {
      setClockTick((t) => (t + 1) & 0xffff); // cheap wraparound
    });
    return unsubscribe;
  }, [canvasCtx?.clock]);

  // Calculate animation progress using utility function
  const progress = calculateAnimationProgress(
    currentTime,
    obj.animationStart || 0,
    obj.animationDuration || 5,
    obj.animationEasing || 'easeOut'
  );

  const groupX = animatedProps.x ?? obj.x;
  const groupY = animatedProps.y ?? obj.y;
  const groupRotationDeg = obj.rotation || 0;
  const groupScaleX = (obj.properties?.scaleX ?? 1) * (animatedProps.scaleX ?? 1);
  const groupScaleY = (obj.properties?.scaleY ?? 1) * (animatedProps.scaleY ?? 1);

  const debug = !!obj.properties?.debug?.logRenderer;
  // Global quick toggle for hand debug via URL or localStorage
  const handDebug = React.useMemo(() => {
    try {
      const q = typeof window !== 'undefined' ? window.location.search : '';
      return (typeof localStorage !== 'undefined' && localStorage.getItem('HAND_DEBUG') === '1') || /(?:^|[?&])handdebug=1(?:&|$)/i.test(q);
    } catch { return false; }
  }, []);
  const debugLog = React.useCallback((level: 'log' | 'warn' | 'error', ...args: any[]) => {
    if (debug) (console as any)[level](...args);
  }, [debug]);
  const tryGetPath2D = React.useCallback((d: string): Path2D | null => { try { return getPath2D(d); } catch { return null; } }, []);

  // (Removed unused 'paths' variable to fix ESLint error)
  
  // Check if we need to apply calibration offset to path drawing
  
  // Helper: split a compound path 'd' into separate subpaths at M/m commands
  const splitPathD = React.useCallback((d: string): string[] => {
    if (!d || typeof d !== 'string') return [];
    const norm = d.replace(/\s+/g, ' ').trim();
    const chunks = norm.split(/(?=[Mm][^Mm]*)/g).filter(Boolean);
    const out: string[] = [];
    for (let c of chunks) {
      c = c.trim();
      if (!c) continue;
      if (!/^[Mm]/.test(c)) c = 'M ' + c;
      if (c.length < 6) continue;
      out.push(c);
    }
    return out.length ? out : [norm];
  }, []);

  // Compute precise total length and drawable path information
  const { totalLen, drawablePaths } = React.useMemo(() => {
    const arr = Array.isArray(obj.properties?.paths) ? obj.properties.paths : [];
    
    // Use provided totalLen if available and valid, but always recompute per-path lengths and sum for totalLen
    if (typeof obj.properties?.totalLen === 'number' && obj.properties.totalLen > 0) {
      // Compute individual path lengths and also recompute total as the sum of those lengths.
      const drawablePathsTemp: any[] = [];
      let sum = 0;
      
      let runningIndex = 0;
      arr.forEach((p: ParsedPath) => {
        const d = p?.d as string | undefined;
        if (!d) return;
        const subDs = splitPathD(d);

        const cp = p as CachedParsedPath;
        if (!obj.properties?.handFollower?.enabled) {
          cp._lut = undefined;
          console.log('[SvgPathRenderer] Hand follower disabled - skipping LUT generation for path');
        } else if (p.lut && !cp._lut) {
          cp._lut = p.lut;
          console.log('[SvgPathRenderer] Hand follower enabled - using provided LUT');
        }
        // PHASE0: reuse provided samples/lengths when available
        if (p.samples && !cp._samples) cp._samples = p.samples;
        // Split compound paths into subpaths so reveal only affects one fragment at a time
        for (const subD of subDs) {
          const subLen = getPathTotalLength(subD);
          if (subLen > 0) {
            drawablePathsTemp.push({ ...p, d: subD, index: runningIndex++, len: subLen });
            sum += subLen;
          }
        }
      });
      
      return {
        totalLen: sum,
        drawablePaths: drawablePathsTemp
      };
    }
    
    // Compute from scratch
    const drawablePathsTemp: any[] = [];
    let sum = 0;
    let runningIndex = 0;
    
      arr.forEach((p: ParsedPath) => {
        const d = p?.d as string | undefined;
        if (!d) {
        if (debug) {
          console.warn('[SvgPathRenderer] Path missing d attribute:', p);
        }
        return;
      }

      // Validate SVG path data
      if (!d.trim().match(/^[MmLlHhVvCcSsQqTtAaZz0-9\s,.-]+$/)) {
        debugLog('error', '[SvgPathRenderer] Invalid SVG path data:', d);
        return;
      }

      const subDs = splitPathD(d);

      // PHASE0: reuse provided sampler results
      const cp = p as CachedParsedPath;
      if (p.samples && !cp._samples) cp._samples = p.samples;
      if (p.lut && !cp._lut) cp._lut = p.lut;
      // Do not auto-sample at render time

      // PHASE1: lazy LUT building - only build when hand follower is enabled and LUT is missing
      // Safe default: only if handFollower flag is ON and follower is enabled
      if (obj.properties?.handFollower?.enabled) {
        // Do not build LUT here to avoid blocking when enabling hand on complex SVGs.
        // If provided, adopt the LUT; otherwise it will be lazily built for the active path only.
        if (!cp._lut && p.lut) cp._lut = p.lut;
      } else {
        // If follower is disabled, ensure no LUT is attached
        cp._lut = undefined;
        if (debug) {
          console.log('[SvgPathRenderer] Hand follower disabled - skipping LUT generation for path');
        }
      }

      for (const subD of subDs) {
        const subLen = getPathTotalLength(subD);
        if (subLen > 0) {
          drawablePathsTemp.push({ ...p, d: subD, index: runningIndex++, len: subLen });
          sum += subLen;
        }
      }
    });
    
    return {
      totalLen: sum,
      drawablePaths: drawablePathsTemp
    };
  }, [obj.properties?.paths, obj.properties?.totalLen, debug, debugLog, obj.properties?.handFollower?.enabled]);
  const draw = obj.animationType === 'drawIn';
  // const previewMode = !!obj.properties?.previewDraw;
  const drawOptions = obj.properties?.drawOptions || null;
  // Fill strategy wiring
  const fillKind: 'afterAll' | 'perPath' | 'batched' = (drawOptions?.fillStrategy?.kind as any) || 'afterAll';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mode: 'standard' | 'preview' | 'batched' = (drawOptions?.mode as any) || (fillKind === 'perPath' ? 'preview' : fillKind === 'batched' ? 'batched' : 'standard');
  const batchesN: number = Math.max(2, Number(drawOptions?.fillStrategy?.batchesN || 4));
  // const previewStrokeColor = drawOptions?.previewStroke?.color || '#3b82f6';
  const previewWidthBoost = typeof drawOptions?.previewStroke?.widthBoost === 'number' ? drawOptions.previewStroke.widthBoost : 1;

  // Reveal length is tied to object's duration so timeline edits directly influence drawing speed
  const targetLen = draw ? progress * totalLen : totalLen;
  // Batched fill threshold (ensure last batch fills when complete)
  const fraction = totalLen > 0 ? targetLen / totalLen : 1;
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const filledBatches = totalLen > 0 ? Math.floor(clampedFraction * batchesN + 1e-9) : 0; // 0..batchesN
  const batchThreshold = (fillKind === 'batched' && totalLen > 0)
    ? (Math.min(filledBatches, batchesN) / batchesN) * totalLen
    : totalLen;
  // let consumed = 0;

  // Track LUT builds to trigger rerenders
  // (Removed unused 'lutVersion' state variable to fix ESLint error)
  const [lutTick, setLutTick] = React.useState(0);

  // Compute hand follower node once per relevant changes
  const handFollowerMemo = React.useMemo(() => {
    // Touch lutTick so dependency is meaningful
    void lutTick;
    const handFollowerSettings = obj.properties?.handFollower;
    if (!handFollowerSettings?.enabled) return { node: null, activePath: null };

    // 🔧 SYNCHRONIZATION FIX: Use only drawable paths for hand follower calculation
    // This ensures hand animation and stroke rendering use the same path length basis

    let activePath: any | null = null;
    let localProgress = 0;
    let pathIndex = -1;

    if (drawablePaths.length > 0) {
      let used = 0;
      for (const drawablePath of drawablePaths) {
        const len = drawablePath.len;
        const start = used;
        const end = used + len;

        if (targetLen <= start) {
          activePath = drawablePath;
          localProgress = 0;
          pathIndex = drawablePath.index;
          break;
        }
        if (targetLen < end) {
          const localReveal = Math.max(0, targetLen - start);
          localProgress = len > 0 ? localReveal / len : 0;
          activePath = drawablePath;
          pathIndex = drawablePath.index;
          break;
        }
        used = end;
      }

      if (!activePath && drawablePaths.length > 0) {
        activePath = drawablePaths[0];
        localProgress = 0;
        pathIndex = activePath.index;
      }
    }

    // Fallback: if drawable paths are not yet ready (e.g., immediately after
    // vectorization), try to grab the first available raw path so the hand can
    // mount on first play. This will be replaced automatically once
    // drawablePaths populate.
    if (!activePath?.d) {
      const raw = Array.isArray(obj.properties?.paths) && obj.properties.paths.length > 0
        ? String(obj.properties.paths[0]?.d || '')
        : '';
      if (raw) {
        activePath = {
          d: raw,
          len: getPathTotalLength(raw) || 0,
          index: 0,
          transform: ((obj.properties?.paths[0] as any)?.transform as number[] | undefined) || [1,0,0,1,0,0],
          stroke: (obj.properties?.paths[0] as any)?.stroke,
          strokeWidth: (obj.properties?.paths[0] as any)?.strokeWidth,
          fill: (obj.properties?.paths[0] as any)?.fill,
          fillRule: (obj.properties?.paths[0] as any)?.fillRule,
        } as any;
        localProgress = 0;
      } else {
        return { node: null, activePath: null };
      }
    }

    const cpActive = activePath as CachedParsedPath;

    // Removed periodic hand follower debug logs

    // Render follower whenever enabled and assets are present. Do not require a specific mode.
    if (handFollowerSettings.handAsset && handFollowerSettings.toolAsset) {
      // Scale-aware calibration: scale offset/backtrack by ratio of current scale to calibration base scale
      const currentScale = Number(handFollowerSettings.scale || 1);
      const baseScale = Number(handFollowerSettings.calibrationBaseScale || currentScale || 1);
      const scaleRatio = baseScale !== 0 ? (currentScale / baseScale) : 1;
      const userBacktrack = typeof handFollowerSettings.tipBacktrackPx === 'number' ? handFollowerSettings.tipBacktrackPx : null;
      const cap = (activePath.strokeLinecap || activePath.lineCap || 'round') as 'round'|'butt'|'square';
      const logicalW = (activePath.strokeWidth ?? 3);
      const previewScale = 1 + ((previewWidthBoost || 0) / Math.max(1, logicalW));
      const capExt = (cap === 'round' || cap === 'square') ? 0.5 * logicalW : 0;
      const autoBacktrack = (capExt * previewScale) + 0.4 * logicalW;
      // Respect user-set backtrack even when not drawing; fall back to auto only when user hasn't set one
      let tipBacktrackPx = (userBacktrack !== null)
        ? Math.max(0, userBacktrack) // keep user-set backtrack absolute (world px)
        : (draw ? Math.max(1, autoBacktrack) : 0); // auto already relates to stroke width

      try {
        if (draw && activePath?.d && activePath.len > 0) {
          const lut = (activePath as any)._lut as HandLUT | null;
          const p = Math.max(0, Math.min(1, localProgress));
          const tLen = lut?.len ?? 0;
          if (tLen > 0 && lut) {
            const arc = Math.max(1.5, Math.min(8, logicalW * 0.8));
            const s = p * tLen;
            const backS = Math.max(0, s - arc);
            const fwdS = Math.min(tLen, s + arc);
            const ang0 = samplePoseByS(lut, backS)?.theta ?? 0;
            const ang1 = samplePoseByS(lut, s)?.theta ?? 0;
            const ang2 = samplePoseByS(lut, fwdS)?.theta ?? 0;
            const norm = (a:number)=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
            const d1 = norm(ang1 - ang0);
            const d2 = norm(ang2 - ang1);
            const totalAngleChange = Math.abs(d1) + Math.abs(d2);
            const kappa = totalAngleChange / Math.max(1e-3, (2*arc));
            const damping = Math.max(0.3, Math.min(1, 1 - 6 * kappa));
            // Only damp automatic backtrack; preserve explicit user value
            if (userBacktrack === null) {
              tipBacktrackPx *= damping;
            }

            // Removed verbose curvature analysis logs
          }
        }
      } catch (error) { /* suppress curvature logs */ }

      // Build world-space transform: Group(x,y,rot,scale) * PathLocalTransform
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const mul = (A: number[], B: number[]): number[] => {
        const [a1, b1, c1, d1, e1, f1] = A;
        const [a2, b2, c2, d2, e2, f2] = B;
        return [
          a1 * a2 + c1 * b2,
          b1 * a2 + d1 * b2,
          a1 * c2 + c1 * d2,
          b1 * c2 + d1 * d2,
          a1 * e2 + c1 * f2 + e1,
          b1 * e2 + d1 * f2 + f1,
        ];
      };
      const trs = (tx: number, ty: number, rotDeg: number, sx: number, sy: number): number[] => {
        const r = toRad(rotDeg);
        const cos = Math.cos(r), sin = Math.sin(r);
        const R = [cos, sin, -sin, cos, 0, 0];
        const S = [sx, 0, 0, sy, 0, 0];
        const T = [1, 0, 0, 1, tx, ty];
        return mul(T, mul(R, S));
      };
      const pathM = ((activePath as any).transform as number[] | undefined) || [1, 0, 0, 1, 0, 0];
      const groupM = trs(groupX, groupY, groupRotationDeg, groupScaleX, groupScaleY);
      const worldM = mul(groupM, pathM);

      // Scale-aware Frenet offset: maintain same relative position across user scales
      const baseOffset = handFollowerSettings.calibrationOffset || handFollowerSettings.offset || { x: 0, y: 0 };
      // Offsets are authored at calibrationBaseScale in world-like units tied to the user scale.
      // To preserve the same visual bias across user scale changes, scale proportionally.
      const scaledOffset = {
        x: baseOffset.x * (scaleRatio || 1),
        y: baseOffset.y * (scaleRatio || 1),
      };

      if (debug || handDebug) {
        const prev = lastScaleRef.current;
        if (prev === null || prev !== currentScale) {
          lastScaleRef.current = currentScale;
          try {
            console.log('🧭 [DRIFT INPUT]', {
              prevScale: prev,
              scale: currentScale,
              calibrationBaseScale: baseScale,
              scaleRatio,
              offset: baseOffset,
              backtrackPx: tipBacktrackPx,
              mirror: !!handFollowerSettings.mirror,
            });
          } catch {}
        }
      }

          return {
            node: (
              <ThreeLayerHandFollower
                key={`hand-follower-${obj.id}`}
                pathData={activePath.d}
                pathMatrix={worldM}
                progress={localProgress}
                tipBacktrackPx={tipBacktrackPx}
                handAsset={handFollowerSettings.handAsset}
                toolAsset={handFollowerSettings.toolAsset}
                scale={handFollowerSettings.scale || 1}
                visible={handFollowerSettings.visible !== false}
                debug={!!handFollowerSettings.debug || handDebug}
                mirror={!!handFollowerSettings.mirror}
                showForeground={handFollowerSettings.showForeground !== false}
                extraOffset={scaledOffset}
                nibAnchor={handFollowerSettings.nibAnchor}
                nibLock={!!handFollowerSettings.nibLock}
                toolRotationOffsetDeg={handFollowerSettings.toolRotationOffsetDeg}
                rotationMode={(handFollowerSettings as any).rotationMode}
                rotationMaxDeg={(handFollowerSettings as any).rotationMaxDeg}
                listening={false}
                mountLayer={overlayLayer}
              />
            ),
            activePath: cpActive
      };
    }

    return { node: null, activePath: cpActive };
  }, [
    obj.properties?.handFollower,
    obj.properties?.handFollower?.tipBacktrackPx,
    drawablePaths,
    targetLen,
    draw,
    previewWidthBoost,
    obj.id,
    debug,
    lutTick,
    // Ensure world transform recomputes when object transform changes
    groupX,
    groupY,
    groupRotationDeg,
    groupScaleX,
    groupScaleY,
    overlayLayer,
    clockTick,
  ]);

  const handNode = handFollowerMemo.node;
  const activeLutPath = handFollowerMemo.activePath;

  // Removed boot and warn logs

  // Build LUT lazily outside render to avoid blocking
  React.useEffect(() => {
    if (!obj.properties?.handFollower?.enabled) return;
    if (!activeLutPath || activeLutPath._lut) return;
    if ((activeLutPath as any)._lutBuilding) return;
    (activeLutPath as any)._lutBuilding = true;
    const build = () => {
      const m = (activeLutPath as any).transform as number[] | undefined;
      const len = (activeLutPath as any).len as number | undefined;
      // Choose a coarser sampling for very long paths to prevent hangs
      const samplePx = Math.max(2, Math.min(8, len ? Math.round(len / 1200) : 2));
      const fromSamples = samplesToLut(activeLutPath._samples);
      if (fromSamples) {
        activeLutPath._lut = fromSamples;
        (activeLutPath as any)._lutBuilding = false;
        setLutTick(t => t + 1);
        return;
      }
      buildHandLUTTransformedAsync(activeLutPath.d as string, m, samplePx)
        .then(lut => {
          activeLutPath._lut = lut;
          setLutTick(t => t + 1);
        })
        .finally(() => { (activeLutPath as any)._lutBuilding = false; });
  // (Removed setLutVersion call; lutVersion state no longer used)
    };
    const ric = (window as any).requestIdleCallback as ((cb: () => void) => number) | undefined;
    if (ric) {
      ric(build);
    } else {
      setTimeout(build, 0);
    }
  }, [obj.properties?.handFollower?.enabled, activeLutPath]);

  // 📊 Simplified Debug Logs
  React.useEffect(() => {
    if (!debug) return;
    
    const now = Date.now();
    const logKey = `general-debug-${obj.id}`;
    const lastLogTime = (window as any)[logKey] || 0;
    
    // Rate limit: Log only every 2 seconds to avoid interference
    if (now - lastLogTime < 2000) return;
    
    (window as any)[logKey] = now;

    // Simple progress update
    console.log('📊 [SvgPathRenderer] Progress', {
      id: obj.id,
      progress: `${(progress * 100).toFixed(1)}%`,
      drawablePaths: drawablePaths.length,
      handFollowerEnabled: !!obj.properties?.handFollower?.enabled
    });
  }, [progress, drawablePaths, obj.id, obj.properties?.debug, obj.properties?.handFollower?.enabled, debug]);

  // 🔍 Simplified Synchronization Debug
  React.useEffect(() => {
    if (!debug || !obj.properties?.handFollower?.enabled) return;

    const now = Date.now();
    const logKey = `sync-debug-${obj.id}`;
    const lastLogTime = (window as any)[logKey] || 0;
    
    // Only log every 2 seconds to avoid interference
    if (now - lastLogTime < 2000) return;
    
    (window as any)[logKey] = now;

    // Simple sync status
    console.log('🔍 [SYNC DEBUG] Animation Status', {
      progress: `${(progress * 100).toFixed(1)}%`,
      targetLen: `${targetLen.toFixed(1)} units`,
      totalLen: `${totalLen.toFixed(1)} units`,
      drawablePaths: drawablePaths.length,
      handFollowerEnabled: true
    });
  }, [progress, targetLen, totalLen, drawablePaths, obj.properties?.handFollower, obj.id, debug]);


  return (
    <>
    <Group
      key={obj.id}
      id={obj.id}
      name={`svg-path-${obj.id}`}
      x={groupX}
      y={groupY}
      rotation={obj.rotation || 0}
      scaleX={groupScaleX}
      scaleY={groupScaleY}
  opacity={obj.type === 'svgPath' ? 1 : (animatedProps.opacity ?? 1)}
      // Bind custom attrs directly so react-konva updates node on time changes
      __progress={progress}
      __totalLen={totalLen}
      __targetLen={targetLen}
      draggable={tool === 'select'}
      listening={true}
      onClick={(e: any) => { 
        e.cancelBubble = true; 
        // Try to set the ID on the event target for reliable detection
        if (e.currentTarget && !e.currentTarget.id?.()) {
          e.currentTarget.id(obj.id);
        }
        onClick(e); 
      }}
      onTap={(e: any) => { 
        e.cancelBubble = true; 
        // Try to set the ID on the event target for reliable detection
        if (e.currentTarget && !e.currentTarget.id?.()) {
          e.currentTarget.id(obj.id);
        }
        onClick(e); 
      }}
      onDragEnd={(e) => {
        onDragEnd(obj.id, e.currentTarget);
      }}
      onTransformEnd={(e) => onTransformEnd(obj.id, e.currentTarget)}
    >
      {/* Invisible background to make the group clickable */}
      <Rect
        x={0}
        y={0}
        width={obj.width || 100}
        height={obj.height || 100}
        fill="transparent"
        listening={true}
        onClick={(e: any) => {
          e.cancelBubble = true;
          // Try to set the ID on the event target for reliable detection
          if (e.currentTarget && !e.currentTarget.id?.()) {
            e.currentTarget.id(obj.id);
          }
          onClick(e);
        }}
        onTap={(e: any) => {
          e.cancelBubble = true;
          // Try to set the ID on the event target for reliable detection
          if (e.currentTarget && !e.currentTarget.id?.()) {
            e.currentTarget.id(obj.id);
          }
          onClick(e);
        }}
  />
      {/* Stroke reveal renderer */}
      <Shape
        listening={false}
        __progress={progress}
        __targetLen={targetLen}
        sceneFunc={(ctx, shape) => {
          const EPS = 1e-3;
          const isComplete = targetLen >= (totalLen - EPS) || progress >= 0.9995;
          let used = 0;
          for (let i = 0; i < drawablePaths.length; i++) {
            const p: any = drawablePaths[i];
            const len = Math.max(0, Number(p.len || 0));
            const start = used;
            const end = used + len;
            used = end;

            if (len <= 0) {
              if (debug) {
                console.warn(`[SvgPathRenderer] [sceneFunc] Skipping path[${i}] - zero length`, { d: p.d, len });
              }
              continue;
            }

            const hasRealStroke = !!p.stroke && p.stroke !== 'none' && p.stroke !== 'transparent';
            let stroke = hasRealStroke
              ? p.stroke
              : (obj.properties?.drawOptions?.previewStroke?.color || '#3b82f6');
            let width = (p.strokeWidth ?? 3) + (draw
              ? (typeof obj.properties?.drawOptions?.previewStroke?.widthBoost === 'number'
                  ? obj.properties.drawOptions.previewStroke.widthBoost
                  : 0)
              : 0);

            const visible = isComplete ? len : Math.max(0, Math.min(len, targetLen - start));
            if (visible <= 0) continue;
            
            const dStr = String(p.d || '');
            if (!dStr) {
              debugLog('error', `[SvgPathRenderer] [sceneFunc] Path[${i}] has no d attribute`);
              continue;
            }
            
            // Use Path2D dashed stroke to reveal without heavy sampling
            const m = (p as any).transform;
            const path2d = tryGetPath2D(dStr);
            if (!path2d) {
              if (debug) console.warn(`[SvgPathRenderer] [sceneFunc] Path2D failed for path[${i}]`);
              continue;
            }

            // Stroke-visibility policy:
            // 1) While the overall object is still drawing, keep preview stroke on previously completed subpaths.
            // 2) When a subpath completes:
            //    - If it has no fill, keep an outline (preview or real stroke).
            //    - If it has a very light/white fill (nearly invisible on white bg), also keep an outline.
            //    - Otherwise, follow hidePreviewOnComplete.
            // Hide preview stroke when the entire object completes (default true for all modes)
            const configuredHide = obj.properties?.drawOptions?.previewStroke?.hideOnComplete;
            const hidePreviewOnComplete =
              typeof configuredHide === 'boolean' ? configuredHide : true;
            // Keep completed strokes visible during the overall drawing progression
            // so prior strokes don’t appear to disappear when a new subpath starts.
            // Respect explicit user settings if provided.
            const keepStrokeIfNoFill =
              obj.properties?.drawOptions?.previewStroke?.keepIfNoFill ?? true;
            const keepUntilAllComplete =
              obj.properties?.drawOptions?.previewStroke?.keepUntilAllComplete ?? true;

            const isPathComplete = visible >= (len - 1e-3);
            // Consider transparent fills as effectively no fill for mode logic
            const fillStr = String(p.fill || '').trim().toLowerCase();
            const hasFill = !!p.fill && fillStr !== 'none' && fillStr !== 'transparent' && !/^rgba\(.*?,.*?,.*?,\s*0\s*\)$/.test(fillStr);

            // Heuristic: treat near-white fills as "invisible" on white backgrounds
            const fillIsNearWhite = hasFill
              ? (() => {
                  const c = String(p.fill || '').toLowerCase().trim();
                  if (c === '#fff' || c === '#ffffff' || c === 'white') return true;
                  // rgb(a)
                  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                  if (m) {
                    const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
                    return (r + g + b) >= 730; // ~ (245*3)
                  }
                  return false;
                })()
              : false;

            let shouldStroke = true;

            if (isPathComplete) {
              if (!hasFill && keepStrokeIfNoFill) {
                shouldStroke = true; // keep outline for line-art subpaths
              } else if (fillIsNearWhite && keepStrokeIfNoFill) {
                shouldStroke = true; // keep outline for white-on-white fills
              } else if (keepUntilAllComplete && !isComplete) {
                // Object not finished yet → keep preview stroke to avoid perceived disappearance
                shouldStroke = true;
              } else {
                shouldStroke = !hidePreviewOnComplete;
              }

              // If we are keeping a stroke at completion and the path has a real stroke, prefer it
              if (shouldStroke && hasRealStroke) {
                stroke = p.stroke;
                width = p.strokeWidth ?? width;
              }
            }

            // Preview/Batched default now keeps previous strokes visible unless explicitly configured

            // During drawing, only render the currently active path's stroke
            const objectStillDrawing = !isComplete && progress < 1;
            const isActive = objectStillDrawing ? (targetLen > start && targetLen <= end) : true;
            // Suppress stroke only for non-active, not-yet-complete paths
            if (objectStillDrawing && !isActive && !isPathComplete) shouldStroke = false;

            // Fill behavior depends on strategy
            // - afterAll: fill only once the entire object completes
            // - perPath:  fill each subpath as soon as it completes
            // - batched:  fill all subpaths that fall within the completed batch threshold
            let shouldFill = false;
            if (hasFill) {
              if (fillKind === 'afterAll') {
                shouldFill = isComplete && visible >= len;
              } else if (fillKind === 'perPath') {
                shouldFill = visible >= len; // path finished, regardless of overall completion
              } else { // 'batched'
                // Fill only when the batch threshold passes this subpath's end
                shouldFill = (end <= batchThreshold);
              }
            }

            if (shouldFill) {
              try {
                const m = (p as any).transform;
                applyTransformContext(ctx, m, () => {
                  const path2d = tryGetPath2D(String(p.d || ''));
                  if (!path2d) return;
                  ctx.fillStyle = p.fill as any;
                  if (p.fillRule) ctx.fill(path2d, p.fillRule);
                  else ctx.fill(path2d);
                });
              } catch (fillError) {
                if (debug) {
                  console.error(`[SvgPathRenderer] [sceneFunc] Fill failed for path[${i}]:`, fillError);
                }
              }
            }

            // Debug after fill decision so we can see final state for this iteration
            if (debug) {
              // eslint-disable-next-line no-console
              console.log(`📏 [STROKE DEBUG] path[${i}] rendering`, {
                id: obj.id,
                pathIndex: i,
                d: p.d?.substring(0, 50) + '...',
                len: p.len,
                stroke,
                width,
                visible,
                progress,
                targetLen,
                start,
                end,
                strokeProgress: len > 0 ? visible / len : 0,
                strokeProgressPercentage: len > 0 ? `${((visible / len) * 100).toFixed(1)}%` : '0%',
                isComplete: visible >= len,
                willFill: shouldFill
              });
            }

            // Stroke after fill so outline remains visible
            if (shouldStroke) {
              applyTransformContext(ctx, m, () => {
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = stroke;
                // Use full path length for exact dash reveal so hand tip aligns
                const dashLen = Math.max(1, len);
                ctx.setLineDash([dashLen, dashLen]);
                const frac = len > 0 ? (visible / len) : 1;
                ctx.lineDashOffset = Math.max(0, dashLen - (dashLen * frac));
                ctx.stroke(path2d);
                // Reset dash to avoid affecting subsequent draws
                ctx.setLineDash([]);
              });
            }
          }
          shape.fillEnabled(false);
        }}
      />
    </Group>
    {/* Always mount follower component; it mounts into overlay layer when provided and returns null */}
    {handNode}
    </>
  );
};
