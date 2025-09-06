import React from 'react';
import type { ImportedSvg } from '../domain/types';
import SvgImportDrawPreview, { SvgImportDrawPreviewHandle } from './SvgImportDrawPreview';
import SvgDrawSettings, { SvgDrawOptions, defaultSvgDrawOptions } from '../../../components/shared/SvgDrawSettings';
import { useAppStore } from '../../../store/appStore';

type Preset = 'photo-subject' | 'line-art' | 'logo-flat' | 'noisy-photo' | 'custom';
const LS_KEY = 'svg-trace-panel:v1';

const SvgTracePanel: React.FC = () => {
  const addObject = useAppStore(s => s.addObject);
  
  // Left column state (controls)
  const [tracePreview, setTracePreview] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const [threshold, setThreshold] = React.useState<number>(128);
  const [preset, setPreset] = React.useState<Preset>('photo-subject');
  const [clusterMode, setClusterMode] = React.useState<'bw' | 'color'>('color');
  const [hierarchyMode, setHierarchyMode] = React.useState<'cutout' | 'stacked'>('stacked');
  const [curveMode, setCurveMode] = React.useState<'pixel' | 'polygon' | 'spline'>('spline');
  const [filterSpeckle, setFilterSpeckle] = React.useState<number>(4);
  const [colorPrecision, setColorPrecision] = React.useState<number>(6);
  const [gradientStep, setGradientStep] = React.useState<number>(16);
  const [cornerThreshold, setCornerThreshold] = React.useState<number>(60);
  const [segmentLength, setSegmentLength] = React.useState<number>(4.0);
  const [spliceThreshold, setSpliceThreshold] = React.useState<number>(45);
  // Advanced section displayed open by default
  const [advancedExpanded, setAdvancedExpanded] = React.useState<boolean>(true);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [status, setStatus] = React.useState<string>('');
  const [lastEngine, setLastEngine] = React.useState<string>('');

  // Right column state (preview/draw)
  const [result, setResult] = React.useState<ImportedSvg | null>(null);
  const [lastSvg, setLastSvg] = React.useState<string | null>(null);
  const [showDrawPreview, setShowDrawPreview] = React.useState<boolean>(true);
  const [drawSvgSnapshot, setDrawSvgSnapshot] = React.useState<string | null>(null);
  const [drawOptions, setDrawOptions] = React.useState<SvgDrawOptions>(defaultSvgDrawOptions);
  const [showDrawSettings, setShowDrawSettings] = React.useState<boolean>(false);
  const [originalImageSize, setOriginalImageSize] = React.useState<{width: number, height: number} | null>(null);
  // Freeze sizes only during vectorization to prevent zoom effect
  const previewGridRef = React.useRef<HTMLDivElement | null>(null);
  const [frozenGridWidth, setFrozenGridWidth] = React.useState<number | null>(null);
  const [isVectorizing, setIsVectorizing] = React.useState<boolean>(false);
  
  // Refs
  const previewRef = React.useRef<SvgImportDrawPreviewHandle | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const leftBoxRef = React.useRef<HTMLDivElement | null>(null);
  const rightBoxRef = React.useRef<HTMLDivElement | null>(null);
  const [frozenBox, setFrozenBox] = React.useState<{ w: number; h: number } | null>(null);
  // Draw preview container freeze - activated when playing animation
  const drawBoxRef = React.useRef<HTMLDivElement | null>(null);
  const [frozenDrawBox, setFrozenDrawBox] = React.useState<{ w: number; h: number } | null>(null);
  const [isPlayingDraw, setIsPlayingDraw] = React.useState<boolean>(false);

  // Only freeze sizes during vectorization to prevent zoom while allowing responsive behavior
  React.useLayoutEffect(() => {
    if (!frozenBox && isVectorizing && leftBoxRef.current) {
      const r = leftBoxRef.current.getBoundingClientRect();
      if (r.width && r.height) setFrozenBox({ w: Math.round(r.width), h: Math.round(r.height) });
    } else if (!isVectorizing && frozenBox) {
      // Clear frozen sizes when not vectorizing to allow responsive behavior
      setFrozenBox(null);
    }
  }, [frozenBox, isVectorizing]);

  // Only freeze draw preview during vectorization OR when playing draw animation
  React.useLayoutEffect(() => {
    if (!frozenDrawBox && (isVectorizing || isPlayingDraw) && drawBoxRef.current) {
      const r = drawBoxRef.current.getBoundingClientRect();
      if (r.width && r.height) {
        // Ensure we capture the content-box size, not border-box
        const computedStyle = window.getComputedStyle(drawBoxRef.current);
        const borderWidth = parseFloat(computedStyle.borderLeftWidth) + parseFloat(computedStyle.borderRightWidth);
        const borderHeight = parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth);
        const paddingWidth = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
        const paddingHeight = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
        
        setFrozenDrawBox({ 
          w: Math.round(r.width - borderWidth - paddingWidth), 
          h: Math.round(r.height - borderHeight - paddingHeight) 
        });
      }
    } else if (!(isVectorizing || isPlayingDraw) && frozenDrawBox) {
      // Clear frozen draw box when not vectorizing AND not playing
      setFrozenDrawBox(null);
    }
  }, [frozenDrawBox, showDrawPreview, result, isVectorizing, isPlayingDraw]);
  
  // Build a minimal SVG string from a list of path d strings (legacy parity)
  const makeSvgFromPaths = React.useCallback((ds: string[], width: number, height: number) => {
    if (!ds.length) return '';
    const header = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
    const body = ds.map(d => `<path d="${d}" fill="none" stroke="#000" stroke-width="1"/>`).join('');
    return `${header}${body}</svg>`;
  }, []);

  // Normalize SVG for proper display (legacy parity)
  const normalizedSvg = React.useMemo(() => {
    if (!lastSvg) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(lastSvg, 'image/svg+xml');
      const srcSvg = doc.querySelector('svg');
      if (!srcSvg) return lastSvg;

      let viewBox = srcSvg.getAttribute('viewBox');
      if (!viewBox) {
        // Create viewBox from width/height if not present
        const width = srcSvg.getAttribute('width') || '100';
        const height = srcSvg.getAttribute('height') || '100';
        viewBox = `0 0 ${width} ${height}`;
      }
      const inner = srcSvg.innerHTML;
      const xmlns = srcSvg.getAttribute('xmlns') || 'http://www.w3.org/2000/svg';
      const keep = srcSvg.getAttributeNames()
        .filter(n => !['width','height','style','viewBox','preserveAspectRatio','xmlns'].includes(n))
        .map(n => `${n}="${srcSvg.getAttribute(n)}"`).join(' ');
      return `<svg xmlns="${xmlns}" ${keep ? keep + ' ' : ''}viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block">${inner}</svg>`;
    } catch {
      return lastSvg;
    }
  }, [lastSvg]);

  // Load saved UI state on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setClusterMode(saved.clusterMode ?? 'color');
      setHierarchyMode(saved.hierarchyMode ?? 'stacked');
      setCurveMode(saved.curveMode ?? 'spline');
      setFilterSpeckle(saved.filterSpeckle ?? 4);
      setColorPrecision(saved.colorPrecision ?? 6);
      setGradientStep(saved.gradientStep ?? 16);
      setCornerThreshold(saved.cornerThreshold ?? 60);
      setSegmentLength(saved.segmentLength ?? 4.0);
      setSpliceThreshold(saved.spliceThreshold ?? 45);
      setThreshold(saved.threshold ?? 128);
      setPreset(saved.preset ?? 'photo-subject');
      setShowDrawPreview(saved.showDrawPreview ?? true);
      setAdvancedExpanded(saved.advancedExpanded ?? false);
    } catch {}
    
    // Apply default preset if none is saved
    if (!localStorage.getItem(LS_KEY)) {
      applyPreset('photo-subject');
    }
  }, []);

  // Persist changes
  React.useEffect(() => {
    const payload = {
      clusterMode, hierarchyMode, curveMode,
      filterSpeckle, colorPrecision, gradientStep,
      cornerThreshold, segmentLength, spliceThreshold,
      threshold, preset, showDrawPreview, advancedExpanded
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch {}
  }, [clusterMode, hierarchyMode, curveMode, filterSpeckle, colorPrecision, gradientStep, cornerThreshold, segmentLength, spliceThreshold, threshold, preset, showDrawPreview, advancedExpanded]);

  const applyPreset = React.useCallback((p: Preset) => {
    setPreset(p);
    if (p === 'photo-subject') {
      setClusterMode('color'); setHierarchyMode('stacked'); setCurveMode('spline');
      setFilterSpeckle(6); setColorPrecision(6); setGradientStep(16);
      setCornerThreshold(60); setSegmentLength(4.0); setSpliceThreshold(45);
    } else if (p === 'line-art') {
      setClusterMode('bw'); setCurveMode('spline');
      setFilterSpeckle(6); setCornerThreshold(80); setSegmentLength(3.5); setSpliceThreshold(35);
    } else if (p === 'logo-flat') {
      setClusterMode('color'); setHierarchyMode('cutout'); setCurveMode('polygon');
      setFilterSpeckle(3); setColorPrecision(6); setGradientStep(48);
    } else if (p === 'noisy-photo') {
      setClusterMode('color'); setHierarchyMode('stacked'); setCurveMode('spline');
      setFilterSpeckle(10); setGradientStep(24); setCornerThreshold(70); setSegmentLength(5.0);
    }
  }, []);

  const onFile = React.useCallback((f: File) => {
    // Clean up previous image URL to prevent memory leaks
    if (tracePreview) {
      URL.revokeObjectURL(tracePreview);
    }
    
    const url = URL.createObjectURL(f);
    setTracePreview(url);
    setStatus(`Loaded: ${f.name}`);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { 
      setImage(img);
      setOriginalImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      setStatus(`Image loaded: ${img.naturalWidth}×${img.naturalHeight}`);
    };
    img.onerror = () => { 
      URL.revokeObjectURL(url);
      setTracePreview(null);
      setStatus('❌ Failed to load image');
    };
    img.src = url;
  }, [tracePreview]);

  const onDrop = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  const runTrace = React.useCallback(() => {
    if (!tracePreview) return;
    setBusy(true);
    setIsVectorizing(true); // Start freeze period
    setStatus('🔍 Analyzing image...');

    // Freeze preview grid width at first vectorize to prevent layout-driven resizing
    if (previewGridRef.current && frozenGridWidth == null) {
      const w = previewGridRef.current.getBoundingClientRect().width;
      if (w && isFinite(w)) {
        setFrozenGridWidth(Math.round(w));
      }
    }
    
    // Legacy approach: create a completely separate image for processing
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      // Image analysis for debugging (legacy parity)
      setStatus(`📊 Image: ${img.width}×${img.height}px, analyzing complexity...`);
      
      // Downscale to stay under WASM pixel limits (legacy parity)
      const HARD_MAX_WASM_DIM = 896;
      const EXTRA_BW_SPLINE_MAX = 720;
      let scale = Math.min(HARD_MAX_WASM_DIM / img.width, HARD_MAX_WASM_DIM / img.height, 1);
      if (clusterMode === 'bw' && curveMode === 'spline') {
        const extraScale = Math.min(EXTRA_BW_SPLINE_MAX / img.width, EXTRA_BW_SPLINE_MAX / img.height, 1);
        if (extraScale < scale) {
          scale = extraScale;
          setStatus(prev => (prev ? `${prev} • BW+Spline clamp: ${EXTRA_BW_SPLINE_MAX}px max` : `BW+Spline clamp: ${EXTRA_BW_SPLINE_MAX}px max`));
        }
      }
      const w = Math.max(1, Math.floor(img.width * scale));
      const h = Math.max(1, Math.floor(img.height * scale));
      
      const canvas = document.createElement('canvas');
      canvas.width = w; 
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setBusy(false); setIsVectorizing(false); return; }
      (ctx as any).imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, w, h);
      let data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // B/W quantization when B/W is selected (legacy parity)
      if (clusterMode === 'bw') {
        // For BW + spline, apply a very light blur first to merge speckles
        if (curveMode === 'spline') {
          const blurCtx = canvas.getContext('2d');
          if (blurCtx) {
            (blurCtx as any).filter = 'blur(0.8px)';
            blurCtx.drawImage(canvas, 0, 0);
            (blurCtx as any).filter = 'none';
          }
          data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        const d = data.data;
        const thr = threshold; // reuse user threshold slider (0..255)
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const a = d[i + 3];
          // Use red-channel threshold to match official demo
          const v = (r < thr) ? 0 : 255;
          d[i] = d[i + 1] = d[i + 2] = v; // bw
          d[i + 3] = a; // preserve alpha
        }
        ctx.putImageData(data, 0, 0);
        data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
      setStatus(`Scaled: ${w}×${h}`);

      const finish = (paths: string[]) => {
        console.log('🔍 Worker returned paths:', paths.length, paths.slice(0, 2)); // Debug: check what paths we get
        
        const imported: ImportedSvg = {
          width: w,
          height: h,
          viewBox: [0, 0, w, h],
          paths: paths.map((d, i) => ({ d, stroke: '#000000', strokeWidth: 2, fill: 'none', opacity: 1, id: `c${i}` as any, hash: String(i) })),
          warnings: []
        };
        setResult(imported);
        
        // Build and set the SVG string using legacy approach
        const svgString = makeSvgFromPaths(paths, w, h);
        console.log('🔍 Generated SVG:', svgString.substring(0, 200) + '...'); // Debug: check SVG output
        setLastSvg(svgString);
        
        setBusy(false);
        setIsVectorizing(false); // End freeze period
        setStatus(paths.length ? `✅ Traced ${paths.length} paths` : '⚠️ No paths found');
      };

      try {
        const worker = new Worker(new URL('../../../vtrace/vtracerWorker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (ev: MessageEvent<any>) => {
          const data = ev.data || {};
          let usedEngineSvg = false;
          
          if (data && data.type === 'progress') {
            const pct = typeof data.pct === 'number' ? Math.max(0, Math.min(100, Math.round(data.pct))) : undefined;
            setStatus(pct != null ? `Tracing (WASM)… ${pct}%` : 'Tracing (WASM)…');
            if (data.stage === 'ready' && data.source) setLastEngine(String(data.source));
            return;
          }
          if (data.error) {
            console.error('🔍 Worker error:', data.error); // Debug: check errors
            setStatus(`❌ WASM error: ${data.error}`);
            setBusy(false);
            setIsVectorizing(false); // End freeze period on error
            worker.terminate();
            return;
          }
          
          // Use worker's SVG directly like legacy code (not reconstructed from paths)
          const engineSvg = data.svg;
          if (engineSvg) {
            setLastSvg(engineSvg);
            // Build ImportedSvg from engine output for accurate canvas preview
            const imported = parseSvgToImported(engineSvg);
            if (imported) setResult(imported);
            usedEngineSvg = true;
          } else if (Array.isArray(data.paths) && data.paths.length) {
            finish(data.paths);
          } else {
            finish([]);
          }
          
          // Still create result for other components that need it
          if (!usedEngineSvg && Array.isArray(data.paths)) {
            const imported: ImportedSvg = {
              width: w,
              height: h,
              viewBox: [0, 0, w, h],
              paths: data.paths.map((d: string, i: number) => ({ d, stroke: '#000000', strokeWidth: 2, fill: 'none', opacity: 1, id: `c${i}` as any, hash: String(i) })),
              warnings: []
            };
            setResult(imported);
          }
          
          setBusy(false);
          setIsVectorizing(false); // End freeze period
          setStatus(data.paths?.length ? `✅ Traced ${data.paths.length} paths` : '⚠️ No paths found');
          
          worker.terminate();
        };
        const opts: Record<string, any> = {
          mode: curveMode,
          hierarchical: hierarchyMode,
          filter_speckle: (clusterMode === 'bw' && curveMode === 'spline') ? Math.max(filterSpeckle, 4) : filterSpeckle,
          color_precision: (clusterMode === 'bw') ? 6 : colorPrecision,
          layer_difference: (clusterMode === 'bw') ? 16 : gradientStep,
          corner_threshold: cornerThreshold,
          length_threshold: (clusterMode === 'bw') ? Math.max(segmentLength, 3) : segmentLength,
          splice_threshold: spliceThreshold,
        };
        console.log('🔍 Sending to worker:', { imageDataSize: data.data.length, imageWidth: data.width, imageHeight: data.height, options: opts }); // Debug: check message to worker
        worker.postMessage({ imageData: data, options: opts });
      } catch (e) {
        setBusy(false);
        setIsVectorizing(false); // End freeze period on error
        setStatus(`❌ Failed to initialize WASM: ${(e as any)?.message || String(e)}`);
      }
    };
    
    img.onerror = () => {
      setBusy(false);
      setIsVectorizing(false); // End freeze period on image error
      setStatus('❌ Failed to load image for processing');
    };
    
    img.src = tracePreview;
  }, [tracePreview, threshold, curveMode, hierarchyMode, clusterMode, filterSpeckle, colorPrecision, gradientStep, cornerThreshold, segmentLength, spliceThreshold]);

  const handleAdd = React.useCallback((payload: { paths: { d: string; stroke?: string; strokeWidth?: number; fill?: string; len?: number }[]; totalLen: number; durationSec: number }) => {
    if (!result) return;
    const w = result.viewBox[2];
    const h = result.viewBox[3];
    addObject({
      id: `draw-${Date.now()}`,
      type: 'svgPath',
      x: 150,
      y: 150,
      width: w,
      height: h,
      rotation: 0,
      properties: {
        paths: payload.paths,
        totalLen: payload.totalLen,
        previewDraw: drawOptions.mode === 'preview',
        drawOptions,
      },
      animationType: 'drawIn',
      animationStart: 0,
      animationDuration: payload.durationSec,
      animationEasing: 'linear',
    });
  }, [addObject, drawOptions, result]);

  // Build/Copy/Download helpers for Generated SVG preview
  const buildSvgString = React.useCallback(() => {
    if (!result) return '';
    const attrs = `viewBox=\"${result.viewBox.join(' ')}\" preserveAspectRatio=\"xMidYMid meet\"`;
    const paths = result.paths
      .map(p => `<path d=\"${p.d}\" fill=\"${p.fill||'none'}\" stroke=\"${p.stroke||'none'}\"${p.strokeWidth?` stroke-width=\"${p.strokeWidth}\"`:''}${p.opacity!=null?` opacity=\"${p.opacity}\"`:''}/>`)
      .join('');
    return `<svg xmlns=\"http://www.w3.org/2000/svg\" ${attrs}>${paths}</svg>`;
  }, [result]);

  const downloadLastSvg = React.useCallback(() => {
    if (!lastSvg) return;
    const blob = new Blob([lastSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trace.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [lastSvg]);

  const copyLastSvg = React.useCallback(async () => {
    if (!lastSvg) return;
    try {
      await navigator.clipboard.writeText(lastSvg);
      setStatus('✅ SVG copied to clipboard');
    } catch (e: any) {
      setStatus('❌ Failed to copy SVG');
    }
  }, [lastSvg]);

  const copySvgPathsOnly = React.useCallback(async () => {
    if (!result) return;
    try {
      const pathData = result.paths.map(p => p.d).join('\n');
      await navigator.clipboard.writeText(pathData);
      setStatus('✅ Path data copied to clipboard');
    } catch (e: any) {
      setStatus('❌ Failed to copy path data');
    }
  }, [result]);

  // Play Draw functionality
  const onPlayDraw = React.useCallback(() => {
    if (!lastSvg) return;
    setDrawSvgSnapshot(lastSvg);
    setIsPlayingDraw(true); // Start canvas freeze
    // Trigger play animation via ref
    setTimeout(() => {
      previewRef.current?.play();
      // End freeze after animation completes (typical duration + buffer)
      setTimeout(() => {
        setIsPlayingDraw(false);
      }, 4000); // 3s animation + 1s buffer
    }, 100);
  }, [lastSvg]);

  // Parse engine SVG to ImportedSvg so canvas preview matches the Generated SVG exactly
  const parseSvgToImported = React.useCallback((svgText: string): ImportedSvg | null => {
    try {
      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return null;
      // viewBox handling
      let vb: [number, number, number, number] = [0, 0, 100, 100];
      const vba = svg.getAttribute('viewBox');
      if (vba) {
        const nums = vba.trim().split(/[\s,]+/).map(Number);
        if (nums.length === 4 && nums.every(n => !isNaN(n))) {
          vb = [nums[0], nums[1], Math.max(1, nums[2]), Math.max(1, nums[3])];
        }
      } else {
        // Derive from bbox if needed
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tmp.setAttribute('width', '0');
        tmp.setAttribute('height', '0');
        tmp.style.position = 'absolute';
        tmp.style.left = '-99999px';
        tmp.style.top = '-99999px';
        document.body.appendChild(tmp);
        Array.from(svg.childNodes).forEach(n => tmp.appendChild(n.cloneNode(true)));
        try {
          const b = (tmp as any).getBBox ? (tmp as any).getBBox() : { x: 0, y: 0, width: 100, height: 100 };
          const pad = Math.max(1, Math.round(Math.max(b.width, b.height) * 0.02));
          vb = [Math.floor(b.x) - pad, Math.floor(b.y) - pad, Math.max(1, Math.ceil(b.width) + 2 * pad), Math.max(1, Math.ceil(b.height) + 2 * pad)];
        } catch {
          vb = [0, 0, 100, 100];
        } finally {
          document.body.removeChild(tmp);
        }
      }
      // Transform helpers (port from legacy)
      type Mat = [number, number, number, number, number, number];
      const I: Mat = [1, 0, 0, 1, 0, 0];
      const mul = (m1: Mat, m2: Mat): Mat => [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
      ];
      const translate = (tx: number, ty: number): Mat => [1, 0, 0, 1, tx, ty];
      const scale = (sx: number, sy: number): Mat => [sx, 0, 0, Math.max(0, sy), 0, 0];
      const rotate = (deg: number): Mat => {
        const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
        return [c, s, -s, c, 0, 0];
      };
      const skewX = (deg: number): Mat => { const t = Math.tan((deg * Math.PI) / 180); return [1, 0, t, 1, 0, 0]; };
      const skewY = (deg: number): Mat => { const t = Math.tan((deg * Math.PI) / 180); return [1, t, 0, 1, 0, 0]; };
      const parseT = (str: string | null | undefined): Mat => {
        if (!str) return I;
        let m = I;
        const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
        let match: RegExpExecArray | null;
        while ((match = re.exec(str))) {
          const fn = match[1];
          const args = match[2].split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
          let t = I as Mat;
          switch (fn) {
            case 'matrix':
              if (args.length === 6) t = [args[0], args[1], args[2], args[3], args[4], args[5]] as Mat;
              break;
            case 'translate':
              t = translate(args[0] || 0, args[1] || 0);
              break;
            case 'scale':
              t = scale(args[0] || 1, args.length > 1 ? args[1] : args[0] || 1);
              break;
            case 'rotate':
              t = args.length > 2
                ? mul(mul(translate(args[1], args[2]), rotate(args[0] || 0)), translate(-args[1], -args[2]))
                : rotate(args[0] || 0);
              break;
            case 'skewX': t = skewX(args[0] || 0); break;
            case 'skewY': t = skewY(args[0] || 0); break;
          }
          m = mul(m, t);
        }
        return m;
      };
      const getCtm = (el: Element): Mat => {
        const chain: Element[] = [];
        let p: Element | null = el;
        while (p && p.nodeName.toLowerCase() !== 'html') { chain.unshift(p); p = p.parentElement; }
        let m = I;
        for (const node of chain) m = mul(m, parseT(node.getAttribute('transform')));
        return m;
      };

      // Collect path elements (with CTM)
      const paths: ImportedSvg['paths'] = [] as any;
      doc.querySelectorAll('path').forEach((p, i) => {
        const d = p.getAttribute('d') || '';
        if (!d) return;
        const stroke = p.getAttribute('stroke') || undefined;
        const sw = Number(p.getAttribute('stroke-width') || '2');
        const fillAttr = p.getAttribute('fill');
        const fill = !fillAttr || fillAttr === 'none' ? undefined : fillAttr;
        const opacity = p.getAttribute('opacity');
        const fillRule = (p.getAttribute('fill-rule') as CanvasFillRule | null) || undefined;
        const m = getCtm(p);
        (paths as any).push({ d, stroke, strokeWidth: isNaN(sw) ? 2 : sw, fill, opacity: opacity ? Number(opacity) : undefined, meta: { transform: m as any, fillRule }, id: `p${i}` as any, hash: String(i) });
      });
      return { width: vb[2], height: vb[3], viewBox: vb, paths, warnings: [] };
    } catch {
      return null;
    }
  }, []);

  // Cleanup image URLs on unmount
  React.useEffect(() => {
    return () => {
      if (tracePreview) {
        URL.revokeObjectURL(tracePreview);
      }
    };
  }, [tracePreview]);
  React.useEffect(() => {
    return () => {
      if (tracePreview) {
        URL.revokeObjectURL(tracePreview);
      }
    };
  }, [tracePreview]);

  return (
    <div className="svg-importer">
      <div className="two-col-grid items-start">
        {/* Left: Vectorize controls */}
    <div className="panel" style={{ height: '100%', minHeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'stretch' }}>
          <h2 style={{color:'#fff',fontSize:'1.25rem',fontWeight:700,marginBottom:24}}>Vectorize Image</h2>
        
        {/* File Upload */}
        <div onDrop={onDrop} onDragOver={e => e.preventDefault()} style={{ border: '2px dashed #374151', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <label className="chip" style={{ cursor: 'pointer' }}>
            <input 
              style={{ display: 'none' }} 
              type="file" 
              accept=".png,.jpg,.jpeg,image/png,image/jpeg,image/webp" 
              onChange={e => e.target.files && e.target.files[0] && onFile(e.target.files[0])} 
            />
            Choose file
          </label>
          <span className="text-sm text-gray-300">
            {tracePreview ? 
              (tracePreview.includes('blob:') ? 'Image selected' : 'No file selected') : 
              'No file selected'
            }
          </span>
        </div>

        <div className="text-xs text-gray-400" style={{ marginBottom: 12 }}>Last Engine: {lastEngine || 'official'}</div>

        {/* Threshold */}
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <span className="text-sm text-gray-300" style={{ width: 84, fontWeight: clusterMode === 'bw' ? 600 : 400 }}>Threshold</span>
          <input 
            className="slider-blue" 
            type="range" 
            min={0} 
            max={255} 
            value={threshold} 
            onChange={e => setThreshold(Number(e.target.value))} 
            style={{ 
              flex: 1,
              opacity: clusterMode === 'bw' ? 1 : 0.7,
              filter: clusterMode === 'bw' ? 'none' : 'grayscale(0.3)'
            }} 
          />
          <span className="text-sm text-gray-400" style={{ width: 40, textAlign: 'right' }}>{threshold}</span>
        </div>

        {/* Preset Dropdown */}
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <span className="text-sm text-gray-300" style={{ width: 84 }}>Preset</span>
          <select 
            className="chip" 
            style={{ flex: 1, background: '#374151', border: '1px solid #4b5563', color: '#e5e7eb', padding: '6px 12px', borderRadius: '6px' }}
            value={preset}
            onChange={e => { setPreset(e.target.value as Preset); applyPreset(e.target.value as Preset); }}
          >
            <option value="photo-subject">Photo (Subject)</option>
            <option value="line-art">Line Art</option>
            <option value="logo-flat">Logo Flat</option>
            <option value="noisy-photo">Noisy Photo</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Advanced Trace Options (always open) */}
        <div style={{ marginTop: 12, flex: 1 }}>
          <div className="text-sm text-gray-300" style={{ fontWeight: 700, marginBottom: 8 }}>Advanced Trace Options</div>
          {true && (
            <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Clustering and Layers in one row */}
              <div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <div className="text-sm text-gray-300" style={{ marginBottom: 6, fontWeight: 600 }}>Clustering</div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>setClusterMode('bw')} className={`chip ${clusterMode==='bw'?'chip-active':''}`}>B&W</button>
                      <button onClick={()=>setClusterMode('color')} className={`chip ${clusterMode==='color'?'chip-active':''}`}>Color</button>
                    </div>
                  </div>
                  {clusterMode === 'color' && (
                    <div style={{ flex: 1 }}>
                      <div className="text-sm text-gray-300" style={{ marginBottom: 6, fontWeight: 600 }}>Layers</div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>setHierarchyMode('cutout')} className={`chip ${hierarchyMode==='cutout'?'chip-active':''}`}>CUTOUT</button>
                        <button onClick={()=>setHierarchyMode('stacked')} className={`chip ${hierarchyMode==='stacked'?'chip-active':''}`}>STACKED</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Speckle and Color Precision */}
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <div className="text-sm text-gray-300" style={{ marginBottom: 6, fontWeight: 600 }}>Filter Speckle (Cleaner)</div>
                  <input className="slider-blue" type="range" min={0} max={20} value={filterSpeckle} onChange={e=>{ setFilterSpeckle(Number(e.target.value)); setPreset('custom'); }} style={{ width: '100%' }} />
                </div>
                {clusterMode === 'color' && (
                  <div style={{ flex: 1 }}>
                    <div className="text-sm text-gray-300" style={{ marginBottom: 6, fontWeight: 600 }}>Color Precision (More accurate)</div>
                    <input className="slider-blue" type="range" min={1} max={8} value={colorPrecision} onChange={e=>{ setColorPrecision(Number(e.target.value)); setPreset('custom'); }} style={{ width: '100%' }} />
                  </div>
                )}
              </div>

              {/* Gradient Step (only for color mode) */}
              {clusterMode === 'color' && (
                <div>
                  <div className="text-sm text-gray-300" style={{ marginBottom: 6, fontWeight: 600 }}>Gradient Step (Less layers)</div>
                  <input className="slider-blue" type="range" min={1} max={64} value={gradientStep} onChange={e=>{ setGradientStep(Number(e.target.value)); setPreset('custom'); }} style={{ width: '100%' }} />
                </div>
              )}

              {/* Curve Fitting */}
              <div>
                <div className="text-sm text-gray-300" style={{ marginBottom: 6, fontWeight: 600 }}>Curve Fitting</div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setCurveMode('spline')} className={`chip ${curveMode==='spline'?'chip-active':''}`}>SPLINE</button>
                  <button onClick={()=>setCurveMode('polygon')} className={`chip ${curveMode==='polygon'?'chip-active':''}`}>POLYGON</button>
                  <button onClick={()=>setCurveMode('pixel')} className={`chip ${curveMode==='pixel'?'chip-active':''}`}>PIXEL</button>
                </div>
              </div>

              {/* Spline-specific options in two columns */}
              {curveMode === 'spline' && (
                <>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ flex: 1 }}>
                      <div className="text-sm text-gray-300" style={{ marginBottom: 6, fontWeight: 600 }}>Corner Threshold (Smoother)</div>
                      <input className="slider-blue" type="range" min={0} max={120} value={cornerThreshold} onChange={e=>{ setCornerThreshold(Number(e.target.value)); setPreset('custom'); }} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="text-sm text-gray-300" style={{ marginBottom: 6, fontWeight: 600 }}>Segment Length (More coarse)</div>
                      <input className="slider-blue" type="range" min={1} max={12} step={0.5} value={segmentLength} onChange={e=>{ setSegmentLength(Number(e.target.value)); setPreset('custom'); }} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-300" style={{ marginBottom: 6, fontWeight: 600 }}>Splice Threshold (Less accurate)</div>
                    <input className="slider-blue" type="range" min={0} max={90} value={spliceThreshold} onChange={e=>{ setSpliceThreshold(Number(e.target.value)); setPreset('custom'); }} style={{ width: '100%' }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {status && <div className="text-xs text-gray-300" style={{ marginTop: 'auto', paddingTop: 12 }}>{status}</div>}
      </div>

      {/* Right: Previews */}
  <div className="panel" style={{ height: '100%', minHeight: 600, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'stretch' }}>
        {/* Preview Actions Bar - Above preview cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="text-sm text-gray-300">Preview</span>
          <button className="chip" disabled={!lastSvg} onClick={downloadLastSvg}>Download SVG</button>
          <button className="chip" disabled={!lastSvg} onClick={copyLastSvg}>Copy SVG</button>
          <button className="chip" disabled={!result} onClick={copySvgPathsOnly}>Copy path data</button>
        </div>

        <div
          className="preview-grid w-full"
          ref={previewGridRef}
          style={frozenGridWidth != null && isVectorizing ? { width: frozenGridWidth } : undefined}
        >
          <div
            className="preview-box border-blue-500"
            ref={leftBoxRef}
            style={frozenBox && isVectorizing ? { width: frozenBox.w, height: frozenBox.h } : undefined}
          >
            <div className="preview-label text-blue-300">Original Image</div>
            {tracePreview ? (
              <img 
                ref={imgRef}
                alt="original" 
                src={tracePreview} 
                onLoad={() => setStatus('✅ Image preview loaded')}
                onError={() => setStatus('❌ Failed to load image preview')}
              />
            ) : (
              <div className="preview-placeholder">Choose an image to preview</div>
            )}
          </div>
          <div
            className="preview-box border-green-500"
            ref={rightBoxRef}
            style={frozenBox && isVectorizing ? { width: frozenBox.w, height: frozenBox.h } : undefined}
          >
            <div className="preview-label text-green-300">Generated SVG</div>
            {lastSvg ? (
              <div 
                style={{width:'100%',height:'100%'}} 
                dangerouslySetInnerHTML={{ __html: normalizedSvg }}
              />
            ) : (
              <div className="preview-placeholder">Vectorize to see SVG</div>
            )}
          </div>
        </div>
        <div className="rounded" style={{ background: '#0f172a', border: '1px solid #374151', padding: 12 }}>
          <div className="flex items-center" style={{ gap: 12, marginBottom: 8 }}>
            <div className="text-sm text-gray-300">Draw Preview on Canvas</div>
            <button className="chip" onClick={() => setShowDrawSettings(s => !s)}>⚙️ {showDrawSettings ? 'Hide Settings' : 'Settings'}</button>
            <button className="chip" style={{ background: '#059669' }} onClick={onPlayDraw} disabled={!lastSvg}>▶ Play Draw</button>
            {result && (
              <button
                className="chip"
                style={{ background: '#059669' }}
                onClick={() => {
                  // Clamp draw preview box size before adding
                  if (drawBoxRef.current) {
                    const r = drawBoxRef.current.getBoundingClientRect();
                    setFrozenDrawBox({ w: Math.round(r.width), h: Math.round(r.height) });
                  }
                  // Map imported paths (with meta) to canvas ParsedPath format
                  const canvasPaths = result.paths.map((p: any) => ({
                    d: p.d,
                    stroke: p.stroke,
                    strokeWidth: p.strokeWidth,
                    fill: p.fill,
                    fillRule: p.meta?.fillRule,
                    transform: p.meta?.transform,
                  }));
                  addObject({
                    id: `svg-import-${Date.now()}`,
                    type: 'svgPath',
                    x: 150,
                    y: 150,
                    width: result.viewBox[2] || 400,
                    height: result.viewBox[3] || 300,
                    rotation: 0,
                    properties: {
                      paths: canvasPaths,
                      totalLen: result.paths.length * 100, // Estimated length
                      previewDraw: drawOptions.mode === 'preview',
                      drawOptions,
                    },
                    animationType: 'drawIn',
                    animationStart: 0,
                    animationDuration: 3,
                    animationEasing: 'linear',
                  });
                }}
              >
                Add to Canvas
              </button>
            )}
          </div>
          {showDrawSettings && (
            <SvgDrawSettings value={drawOptions} onChange={setDrawOptions} compact />
          )}
          {result && showDrawPreview && (
            <div
              className="preview-box"
              ref={drawBoxRef}
            >
              <SvgImportDrawPreview 
                ref={previewRef} 
                svg={result} 
                drawOptions={drawOptions} 
                freezeSize={isPlayingDraw || isVectorizing}
                frozenBox={frozenDrawBox ? { width: frozenDrawBox.w, height: frozenDrawBox.h } : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Full-width Vectorize Button at Bottom */}
      <div style={{ gridColumn: '1 / -1', marginTop: 16 }}>
        <button 
          className="chip" 
          disabled={!image || busy} 
          onClick={runTrace} 
          style={{ 
            width: '100%', 
            height: '48px', 
            fontSize: '16px', 
            fontWeight: 600,
            background: busy ? '#374151' : '#3b82f6',
            color: '#ffffff'
          }}
        >
          {busy ? 'Tracing…' : 'Vectorize'}
        </button>
      </div>
    </div>
    </div>
  );
};

export default SvgTracePanel;
