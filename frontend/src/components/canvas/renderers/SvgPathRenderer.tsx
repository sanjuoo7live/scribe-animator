import React from 'react';
import { Group, Rect, Shape } from 'react-konva';
import { BaseRendererProps } from '../renderers/RendererRegistry';
import { calculateAnimationProgress } from '../utils/animationUtils';
import ThreeLayerHandFollower from '../../hands/ThreeLayerHandFollower';
import { PathSampler } from '../../../utils/pathSampler';
import { getPath2D, getHandLUT, HandLUT } from '../../../utils/pathCache';
import type { ParsedPath } from '../../../types/parsedPath';
// PHASE1: import hand follower flag for lazy LUT
import { handFollower } from '../../SvgImporter';

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

  // Calculate animation progress using utility function
  const progress = calculateAnimationProgress(
    currentTime,
    obj.animationStart || 0,
    obj.animationDuration || 5,
    obj.animationEasing || 'easeOut'
  );

  const groupX = animatedProps.x ?? obj.x;
  const groupY = animatedProps.y ?? obj.y;

  const debug = !!obj.properties?.debug?.logRenderer;
  const debugLog = React.useCallback((level: 'log' | 'warn' | 'error', ...args: any[]) => {
    if (debug) (console as any)[level](...args);
  }, [debug]);
  const tryGetPath2D = React.useCallback((d: string): Path2D | null => { try { return getPath2D(d); } catch { return null; } }, []);

  // Memoize paths to prevent hand follower from recalculating on every render
  const paths = React.useMemo(() => {
    const arr = Array.isArray(obj.properties?.paths) ? obj.properties.paths : [];
    return arr.map((p: any) => (p && p.m && !p.transform ? { ...p, transform: p.m } : p));
  }, [obj.properties?.paths]);
  
  // Check if we need to apply calibration offset to path drawing
  
  // Compute precise total length and drawable path information
  const { totalLen, drawablePaths } = React.useMemo(() => {
    const arr = Array.isArray(obj.properties?.paths) ? obj.properties.paths : [];
    
    // Use provided totalLen if available and valid, but always recompute per-path lengths and sum for totalLen
    if (typeof obj.properties?.totalLen === 'number' && obj.properties.totalLen > 0) {
      // Compute individual path lengths and also recompute total as the sum of those lengths.
      const drawablePathsTemp: any[] = [];
      let sum = 0;
      
      arr.forEach((p: ParsedPath, index: number) => {
        const d = p?.d as string | undefined;
        if (!d) return;

        const cp = p as CachedParsedPath;
        // PHASE0: reuse provided samples/lengths when available
        if (p.samples && !cp._samples) cp._samples = p.samples;
        if (p.lut && !cp._lut) cp._lut = p.lut;
        if (!cp._samples) {
          try {
            cp._samples = PathSampler.samplePath(d, 1.25, undefined);
          } catch (error) {
            cp._samples = [];
          }
        }
        let len = typeof p.len === 'number' ? p.len : 0;
        if (len <= 0) {
          const _s = cp._samples;
          len = _s && _s.length ? _s[_s.length - 1].cumulativeLength : 0;
        }
        cp.len = len;
        if (!cp._lut) {
          try {
            cp._lut = getHandLUT(d, 2);
          } catch {
            cp._lut = null;
          }
        }

        if (len > 0) {
          drawablePathsTemp.push({ ...p, index, len });
          sum += len;
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
    
      arr.forEach((p: ParsedPath, index: number) => {
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

      // PHASE0: reuse provided sampler results
      const cp = p as CachedParsedPath;
      if (p.samples && !cp._samples) cp._samples = p.samples;
      if (p.lut && !cp._lut) cp._lut = p.lut;
      if (!cp._samples) {
        try {
          cp._samples = PathSampler.samplePath(d, 1.25, undefined);
        } catch (error) {
          debugLog('error', '[SvgPathRenderer] PathSampler failed for path:', d, error);
          cp._samples = [];
        }
      }
      let len = typeof p.len === 'number' ? p.len : 0;
      if (len <= 0) {
        // Use cached samples to compute transform-aware length
        const _s = cp._samples;
        len = _s && _s.length ? _s[_s.length - 1].cumulativeLength : 0;
      }
      cp.len = len;
      
      // PHASE1: lazy LUT building - only build when hand follower is enabled
      const handFollowerEnabled = obj.properties?.handFollower?.enabled;
      if (!cp._lut && handFollowerEnabled && handFollower.lazyLUT) {
        try {
          cp._lut = getHandLUT(d, 2);
          if (debug) {
            console.log(`[Phase1] Lazy LUT built for path: ${d.substring(0, 30)}...`);
          }
        } catch {
          cp._lut = null;
        }
      }

      if (len > 0) {
        drawablePathsTemp.push({ ...p, index, len });
        sum += len;
      } else if (debug) {
        const debugSamples = cp._samples;
        console.warn('[SvgPathRenderer] Path has zero length:', { d, samples: debugSamples?.length ?? 0, index });
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
  // const fillKind: 'afterAll' | 'perPath' | 'batched' = drawOptions?.fillStrategy?.kind
  //   || (previewMode ? 'perPath' : 'afterAll');
  // const batchesN = Math.max(2, Number(drawOptions?.fillStrategy?.batchesN || 4));
  // const previewStrokeColor = drawOptions?.previewStroke?.color || '#3b82f6';
  const previewWidthBoost = typeof drawOptions?.previewStroke?.widthBoost === 'number' ? drawOptions.previewStroke.widthBoost : 1;

  // Reveal length is tied to object's duration so timeline edits directly influence drawing speed
  const targetLen = draw ? progress * totalLen : totalLen;
  // Batched fill threshold (ensure last batch fills when complete)
  // const fraction = totalLen > 0 ? targetLen / totalLen : 1;
  // const clampedFraction = Math.max(0, Math.min(1, fraction));
  // const filledBatches = totalLen > 0 ? Math.floor(clampedFraction * batchesN + 1e-9) : 0; // 0..batchesN
  // const batchThreshold = (fillKind === 'batched' && totalLen > 0)
  //   ? (Math.min(filledBatches, batchesN) / batchesN) * totalLen
  //   : totalLen;
  // let consumed = 0;

  // Compute hand follower node once per relevant changes
  const handNode = React.useMemo(() => {
    const handFollowerSettings = obj.properties?.handFollower;
    if (!handFollowerSettings?.enabled) return null;

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
      
      // If no active path found, use the first drawable path
      if (!activePath && drawablePaths.length > 0) {
        activePath = drawablePaths[0];
        localProgress = 0;
        pathIndex = activePath.index;
      }
    }
    
    if (!activePath?.d) return null;

    // Simple debug logging to avoid interference
    if (debug && activePath) {
      const now = Date.now();
      const lastLogKey = `hand-debug-${obj.id}`;
      const lastLogTime = (window as any)[lastLogKey] || 0;
      
      if (now - lastLogTime > 1000) { // Rate limit to once per second
        (window as any)[lastLogKey] = now;
        console.log('🤚 [HAND DEBUG] Hand Follower', {
          pathIndex,
          localProgress: `${(localProgress * 100).toFixed(1)}%`,
          targetLen: `${targetLen.toFixed(1)} units`
        });
      }
    }

    if (handFollowerSettings.mode === 'professional' && handFollowerSettings.handAsset && handFollowerSettings.toolAsset) {
      const userBacktrack = typeof handFollowerSettings.tipBacktrackPx === 'number' ? handFollowerSettings.tipBacktrackPx : null;
      const cap = (activePath.strokeLinecap || activePath.lineCap || 'round') as 'round'|'butt'|'square';
      const logicalW = (activePath.strokeWidth ?? 3);
      const previewScale = 1 + ((previewWidthBoost || 0) / Math.max(1, logicalW));
      const capExt = (cap === 'round' || cap === 'square') ? 0.5 * logicalW : 0;
      const autoBacktrack = (capExt * previewScale) + 0.4 * logicalW;
      let tipBacktrackPx = draw ? Math.max(1, (userBacktrack ?? autoBacktrack)) : 0;

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
            tipBacktrackPx *= damping;

            // 🔍 Add curvature analysis logging
            if (debug) {
              // eslint-disable-next-line no-console
              console.log('🎯 [HAND DEBUG] Curvature Analysis', {
                id: obj.id,
                p: `${(p * 100).toFixed(1)}%`,
                tLen,
                arc,
                angles: { ang0, ang1, ang2 },
                angleChanges: { d1, d2, totalAngleChange },
                kappa,
                damping,
                tipBacktrackPx
              });
            }
          }
        }
      } catch (error) {
        if (debug) {
          console.error('🤚 [HAND DEBUG] Curvature calculation error:', error);
        }
      }

      return (
        <ThreeLayerHandFollower
          key="hand-follower"
          pathData={activePath.d}
          pathMatrix={(activePath as any).transform as number[] | undefined}
          progress={localProgress}
          tipBacktrackPx={tipBacktrackPx}
          handAsset={handFollowerSettings.handAsset}
          toolAsset={handFollowerSettings.toolAsset}
          scale={handFollowerSettings.scale || 1}
          visible={handFollowerSettings.visible !== false}
          debug={!!handFollowerSettings.debug}
          mirror={!!handFollowerSettings.mirror}
          showForeground={handFollowerSettings.showForeground !== false}
          extraOffset={handFollowerSettings.calibrationOffset || handFollowerSettings.offset || { x: 0, y: 0 }}
        />
      );
    }
    return null;
  }, [obj.properties?.handFollower, drawablePaths, targetLen, draw, previewWidthBoost, obj.id, debug]);

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
    <Group
      key={obj.id}
      id={obj.id}
      name={`svg-path-${obj.id}`}
      x={groupX}
      y={groupY}
      rotation={obj.rotation || 0}
      scaleX={(obj.properties?.scaleX ?? 1) * (animatedProps.scaleX ?? 1)}
      scaleY={(obj.properties?.scaleY ?? 1) * (animatedProps.scaleY ?? 1)}
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
            
            // Use cached samples rather than re-sampling per frame
            const samples = (p as any)._samples as ReturnType<typeof PathSampler.samplePath> || [];
            if (!samples.length) {
              if (debug) {
                console.warn(`[SvgPathRenderer] [sceneFunc] Path[${i}] generated no samples:`, dStr);
              }
              continue;
            }

            // Stroke-visibility policy:
            // 1) While the overall object is still drawing, keep preview stroke on previously completed subpaths.
            // 2) When a subpath completes:
            //    - If it has no fill, keep an outline (preview or real stroke).
            //    - If it has a very light/white fill (nearly invisible on white bg), also keep an outline.
            //    - Otherwise, follow hidePreviewOnComplete.
            const hidePreviewOnComplete =
              obj.properties?.drawOptions?.previewStroke?.hideOnComplete ?? true;
            const keepStrokeIfNoFill =
              obj.properties?.drawOptions?.previewStroke?.keepIfNoFill ?? true;
            const keepUntilAllComplete =
              obj.properties?.drawOptions?.previewStroke?.keepUntilAllComplete ?? true;

            const isPathComplete = visible >= (len - 1e-3);
            const hasFill = !!p.fill && p.fill !== 'none';

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
                samples: samples.length,
                firstSample: samples[0],
                lastSample: samples[samples.length - 1],
                
                // Stroke drawing details
                strokeProgress: len > 0 ? visible / len : 0,
                strokeProgressPercentage: len > 0 ? `${((visible / len) * 100).toFixed(1)}%` : '0%',
                isComplete: visible >= len,
                willFill: visible >= len && p.fill && p.fill !== 'none'
              });
            }

            if (shouldStroke) {
              const m = (p as any).transform;
              applyTransformContext(ctx, m, () => {
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = stroke;
                ctx.beginPath();

                // GAP-AWARE STROKING: start new subpath when there's a big jump between samples
                const gapPx = Math.max(2, 1.5 * width);
                const gap2  = gapPx * gapPx;

                // Start drawing from the beginning so the already-drawn portion stays visible
                let j = 0;

                if (samples.length) {
                  // Start path at the beginning so the already-drawn portion stays visible
                  ctx.moveTo(samples[0].x, samples[0].y);

                  // Draw fully-visible segments
                  for (j = 1; j < samples.length && samples[j].cumulativeLength <= visible; j++) {
                    const A = samples[j - 1], B = samples[j];
                    const dx = B.x - A.x, dy = B.y - A.y;
                    if ((dx * dx + dy * dy) > gap2) ctx.moveTo(B.x, B.y);
                    else ctx.lineTo(B.x, B.y);
                  }

                  // Interpolate partially visible last segment
                  if (j < samples.length && j > 0) {
                    const A = samples[j - 1], B = samples[j];
                    const t = (visible - A.cumulativeLength) / Math.max(1e-6, B.cumulativeLength - A.cumulativeLength);
                    const x = A.x + t * (B.x - A.x);
                    const y = A.y + t * (B.y - A.y);
                    const dx = x - A.x, dy = y - A.y;
                    if ((dx * dx + dy * dy) > gap2) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                  }
                }

                ctx.stroke();
              });
            }

            if (visible >= len && p.fill && p.fill !== 'none') {
              try {
                const m = (p as any).transform;
                applyTransformContext(ctx, m, () => {
                  const path2d = tryGetPath2D(String(p.d || ''));
                  if (!path2d) return;
                  ctx.fillStyle = p.fill;
                  if (p.fillRule) ctx.fill(path2d, p.fillRule);
                  else ctx.fill(path2d);
                });
              } catch (fillError) {
                if (debug) {
                  console.error(`[SvgPathRenderer] [sceneFunc] Fill failed for path[${i}]:`, fillError);
                }
              }
            }
          }
          shape.fillEnabled(false);
        }}
      />
  {handNode}
    </Group>
  );
};
