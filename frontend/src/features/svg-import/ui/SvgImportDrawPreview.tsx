import React, { forwardRef, useImperativeHandle } from 'react';
import type { ImportedSvg } from '../domain/types';
import type { SvgDrawOptions } from '../../../components/shared/SvgDrawSettings';
import { getPath2D, getPathTotalLength } from '../../../utils/pathCache';

type PathItem = {
  d: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  len?: number;
  transform?: [number, number, number, number, number, number];
  fillRule?: CanvasFillRule;
};

type Props = {
  svg: ImportedSvg;
  drawOptions: SvgDrawOptions;
  dprCap?: number;
  // Optional: when true, component fills its parent (useful inside fixed preview boxes)
  // and avoids jarring resets while you animate or vectorize.
  freezeSize?: boolean;
  frozenBox?: { width: number; height: number } | null;
};

export type SvgImportDrawPreviewHandle = {
  play: () => void;
  stop: () => void;
};

const SvgImportDrawPreview = forwardRef<SvgImportDrawPreviewHandle, Props>(({ svg, drawOptions, dprCap = 1.5, freezeSize = false, frozenBox = null }, ref) => {
  const holderRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stateRef = React.useRef({
    paths: [] as PathItem[],
    lens: [] as number[],
    total: 0,
    vb: { x: svg.viewBox[0], y: svg.viewBox[1], w: Math.max(1, svg.viewBox[2]), h: Math.max(1, svg.viewBox[3]) },
    raf: 0 as number | 0,
    playing: false,
    startedAt: 0,
    durationMs: 3000,
    accumCanvas: null as HTMLCanvasElement | null,
    accumCtx: null as CanvasRenderingContext2D | null,
    accumIndex: -1,
    cursorIndex: 0,
    cursorStartLen: 0,
    lastEp: 0,
    lastFilledUpTo: -1,
    batchesN: 4,
  });

  const computeDurationSec = React.useCallback((totalLen: number) => {
    const sp = drawOptions.speed;
    if (sp.kind === 'duration') return Math.max(0.1, sp.durationSec ?? 3);
    const pps = Math.max(1, sp.pps ?? 300);
    return Math.max(0.5, totalLen / pps);
  }, [drawOptions.speed]);

  // Build path list from imported svg once
  React.useEffect(() => {
    // Update viewBox to match the newly provided SVG (fixes misalignment after re-vectorize)
    stateRef.current.vb = {
      x: svg.viewBox[0],
      y: svg.viewBox[1],
      w: Math.max(1, svg.viewBox[2]),
      h: Math.max(1, svg.viewBox[3]),
    };

    const items: PathItem[] = svg.paths.map((p: any) => ({
      d: p.d,
      stroke: p.stroke && p.stroke !== 'none' ? p.stroke : undefined,
      strokeWidth: p.strokeWidth,
      fill: p.fill && p.fill !== 'none' ? p.fill : undefined,
      transform: p.meta?.transform as any,
      fillRule: p.meta?.fillRule as any,
    }));
    stateRef.current.paths = items;
    stateRef.current.lens = new Array(items.length).fill(0);
    stateRef.current.total = 0;
    stateRef.current.accumIndex = -1;
    stateRef.current.cursorIndex = 0;
    stateRef.current.cursorStartLen = 0;
    stateRef.current.lastEp = 0;
    stateRef.current.lastFilledUpTo = -1;
    // Clear any old accumulated content
    if (stateRef.current.accumCtx && stateRef.current.accumCanvas) {
      stateRef.current.accumCtx.clearRect(0, 0, stateRef.current.accumCanvas.width, stateRef.current.accumCanvas.height);
    }

    // Measure lengths incrementally to avoid jank
    const CHUNK = 64;
    let i = 0;
    const scratchMeasure = () => {
      const st = stateRef.current;
      const end = Math.min(i + CHUNK, items.length);
      for (let j = i; j < end; j++) {
        try {
          const L = getPathTotalLength(items[j].d);
          st.lens[j] = L;
          items[j].len = L;
          st.total += L;
        } catch {
          st.lens[j] = 0;
          items[j].len = 0;
        }
      }
      i = end;
      if (i < items.length) {
        setTimeout(scratchMeasure, 0);
      }
    };
    scratchMeasure();
  }, [svg]);

  const stop = React.useCallback(() => {
    const st = stateRef.current;
    st.playing = false;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0 as any;
  }, []);

  const render = React.useCallback((ep: number) => {
    const st = stateRef.current;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
    const pxW = cvs.width;  // device pixels
    const pxH = cvs.height;
    const sx = pxW / Math.max(1, st.vb.w);
    const sy = pxH / Math.max(1, st.vb.h);
    const scale = Math.min(sx, sy); // preserveAspectRatio="xMidYMid meet"
    const offX = Math.floor((pxW - st.vb.w * scale) / 2);
    const offY = Math.floor((pxH - st.vb.h * scale) / 2);
    if (ep < st.lastEp) {
      if (st.accumCtx && st.accumCanvas) {
        st.accumCtx.clearRect(0, 0, st.accumCanvas.width, st.accumCanvas.height);
      }
      st.accumIndex = -1;
      st.cursorIndex = 0;
      st.cursorStartLen = 0;
      st.lastFilledUpTo = -1;
    }

    const drawAccum = (idx: number) => {
      if (!st.accumCtx) return;
      const p = st.paths[idx];
      if (!p) return;
      const ag = st.accumCtx;
      ag.save();
      ag.translate(offX - st.vb.x * scale, offY - st.vb.y * scale);
      ag.scale(scale, scale);
      if (p.transform) ag.transform(p.transform[0], p.transform[1], p.transform[2], p.transform[3], p.transform[4], p.transform[5]);
      try {
        const path = getPath2D(p.d);
        if (p.stroke || (!p.fill && !p.stroke)) {
          ag.lineWidth = p.strokeWidth || 2;
          ag.lineCap = 'round';
          ag.lineJoin = 'round';
          ag.strokeStyle = p.stroke || '#111827';
          ag.setLineDash([]);
          ag.stroke(path);
        }
        if (drawOptions.mode !== 'preview' && p.fill) {
          ag.fillStyle = p.fill;
          // apply correct fill-rule if provided
          if (p.fillRule) (ag as any).fill(path, p.fillRule);
          else ag.fill(path);
        }
      } catch {}
      ag.restore();
    };

    const T = ep * (st.total || 1);
    let cursorIndex = st.cursorIndex;
    let cursorStartLen = st.cursorStartLen;
    while (cursorIndex < st.paths.length && T >= cursorStartLen + (st.lens[cursorIndex] || 0)) {
      if (cursorIndex > st.accumIndex) {
        if (st.accumIndex === -1 && st.accumCtx && st.accumCanvas) {
          st.accumCtx.clearRect(0, 0, st.accumCanvas.width, st.accumCanvas.height);
        }
        drawAccum(cursorIndex);
        st.accumIndex = cursorIndex;
      }
      cursorStartLen += st.lens[cursorIndex] || 0;
      cursorIndex++;
    }
    st.cursorIndex = cursorIndex;
    st.cursorStartLen = cursorStartLen;

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    if (st.accumCanvas) ctx.drawImage(st.accumCanvas, 0, 0);

    if (cursorIndex < st.paths.length) {
      const p = st.paths[cursorIndex];
      const len = st.lens[cursorIndex] || 0;
      const local = Math.max(0, Math.min(len, T - cursorStartLen));
      if (local > 0) {
        ctx.save();
        ctx.translate(offX - st.vb.x * scale, offY - st.vb.y * scale);
        ctx.scale(scale, scale);
        if (p.transform) ctx.transform(p.transform[0], p.transform[1], p.transform[2], p.transform[3], p.transform[4], p.transform[5]);
        try {
          const path = getPath2D(p.d);
          ctx.lineWidth = (p.strokeWidth || 2) * (drawOptions.previewStroke?.widthBoost ?? 1);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = drawOptions.previewStroke?.color || p.stroke || '#3b82f6';
          const SAFE_MAX = 4096;
          const dashLen = Math.min(len, SAFE_MAX);
          ctx.setLineDash([dashLen, dashLen]);
          ctx.lineDashOffset = Math.max(0, dashLen - (dashLen * (local / len)));
          ctx.stroke(path);
        } catch {}
        ctx.restore();
      }
    }
    // Fill strategy parity
    const fillKind = drawOptions.fillStrategy?.kind || (drawOptions.mode === 'preview' ? 'perPath' : 'afterAll');
    st.batchesN = drawOptions.fillStrategy?.batchesN ?? 4;
    if (st.accumCtx) {
      const ag = st.accumCtx;
      const fillRange = (from: number, to: number) => {
        if (to < from) return;
        ag.save();
        ag.translate(offX - st.vb.x * scale, offY - st.vb.y * scale);
        ag.scale(scale, scale);
        for (let i = from; i <= to; i++) {
          const p = st.paths[i];
          if (!p?.fill) continue;
          try {
            const path = getPath2D(p.d);
            ag.save();
            if (p.transform) ag.transform(p.transform[0], p.transform[1], p.transform[2], p.transform[3], p.transform[4], p.transform[5]);
            ag.fillStyle = p.fill;
            if (p.fillRule) (ag as any).fill(path, p.fillRule);
            else ag.fill(path);
            ag.restore();
          } catch {}
        }
        ag.restore();
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        if (st.accumCanvas) ctx.drawImage(st.accumCanvas, 0, 0);
      };
      if (fillKind === 'perPath') {
        const startI = Math.max(st.lastFilledUpTo + 1, 0);
        const endI = Math.max(-1, cursorIndex - 1);
        if (endI >= startI) { fillRange(startI, endI); st.lastFilledUpTo = endI; }
      } else if (fillKind === 'batched') {
        const total = st.paths.length;
        const batches = Math.max(2, st.batchesN);
        const batchSize = Math.max(1, Math.ceil(total / batches));
        const completed = Math.max(0, cursorIndex);
        const upto = Math.min(total - 1, Math.floor(completed / batchSize) * batchSize - 1);
        const startI = Math.max(st.lastFilledUpTo + 1, 0);
        if (upto >= startI) { fillRange(startI, upto); st.lastFilledUpTo = upto; }
      } else if (fillKind === 'afterAll' && ep >= 1) {
        const startI = Math.max(st.lastFilledUpTo + 1, 0);
        const endI = st.paths.length - 1;
        if (endI >= startI) { fillRange(startI, endI); st.lastFilledUpTo = endI; }
      }
    }
    st.lastEp = ep;
  }, [dprCap, drawOptions.mode, drawOptions.previewStroke?.color, drawOptions.previewStroke?.widthBoost, drawOptions.fillStrategy?.kind, drawOptions.fillStrategy?.batchesN]);

  const tick = React.useCallback(() => {
    const st = stateRef.current;
    if (!st.playing) return;
    const ep = Math.min(1, (performance.now() - st.startedAt) / Math.max(1, st.durationMs));
    render(ep);
    if (ep >= 1) { st.playing = false; st.raf = 0 as any; return; }
    st.raf = requestAnimationFrame(tick);
  }, [render]);

  const play = React.useCallback(() => {
    const st = stateRef.current;
    st.durationMs = computeDurationSec(Math.max(1, st.total)) * 1000;
    st.startedAt = performance.now();
    st.playing = true;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = requestAnimationFrame(tick);
  }, [computeDurationSec, tick]);

  useImperativeHandle(ref, () => ({ play, stop }), [play, stop]);

  const resize = React.useCallback(() => {
    const holder = holderRef.current;
    const cvs = canvasRef.current;
    if (!holder || !cvs) return;
    const rect = holder.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
    const pxW = Math.max(32, Math.round(width * dpr));
    const pxH = Math.max(32, Math.round(height * dpr));
    if (cvs.width === pxW && cvs.height === pxH) {
      return;
    }
    // Rebuild the accumulated layer at the new pixel size to avoid blur
    const st = stateRef.current;
    cvs.width = pxW; cvs.height = pxH;
    const newAccum = document.createElement('canvas');
    newAccum.width = pxW;
    newAccum.height = pxH;
    st.accumCanvas = newAccum;
    st.accumCtx = newAccum.getContext('2d');
    // Reset accumulation indices so render() re-draws all completed paths at current progress
    const keepEp = st.lastEp || 0;
    st.accumIndex = -1;
    st.cursorIndex = 0;
    st.cursorStartLen = 0;
    render(keepEp);
  }, [dprCap, render]);

  // Coalesce many resize events into a single rAF for snappy UI
  const resizeRaf = React.useRef<number | null>(null);

  React.useEffect(() => {
    const schedule = () => {
      if (resizeRaf.current) return;
      resizeRaf.current = requestAnimationFrame(() => {
        resizeRaf.current = null;
        resize();
      });
    };
    const ro = new ResizeObserver(() => { schedule(); });
    if (holderRef.current) ro.observe(holderRef.current);
    const onWin = () => { schedule(); };
    window.addEventListener('resize', onWin);
    // Always resize once on mount, but clamp to frozenBox if frozen
    resize();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWin);
      if (resizeRaf.current) cancelAnimationFrame(resizeRaf.current);
      stop();
    };
  }, [resize, stop]);

  // Ensure holder/canvas keep fixed CSS pixel size while frozen
  const holderStyle = React.useMemo(() => {
    // Always fill the parent preview box so it resizes with the modal
    return { width: '100%', height: '100%', overflow: 'hidden' } as React.CSSProperties;
  }, []);
  return (
    <div className="flex flex-col gap-2">
      <div ref={holderRef} style={holderStyle}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-300">paths: {stateRef.current.paths.length} · total: {Math.round(stateRef.current.total)}</div>
      </div>
    </div>
  );
});

export default SvgImportDrawPreview;
