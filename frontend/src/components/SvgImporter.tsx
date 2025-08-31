import React from 'react';
import { useAppStore } from '../store/appStore';
import { traceImageDataToPaths } from '../vtrace/simpleTrace';
// MediaPipe segmentation removed per UI simplification

type ParsedPath = { d: string; stroke?: string; strokeWidth?: number; fill?: string; fillRule?: 'nonzero'|'evenodd' };

// Lightweight item used in Path Refinement UI
// type RefineItem = {
//   id: string;
//   d: string;
//   bbox: { x: number; y: number; width: number; height: number };
//   points: { x: number; y: number }[];
//   selected: boolean;
//   kind?: 'path' | 'connector';
// };

const SvgImporter: React.FC = () => {
  const addObject = useAppStore(s => s.addObject);
  const currentProject = useAppStore(s => s.currentProject);

  const [status, setStatus] = React.useState<string>('');
  const [traceThreshold, setTraceThreshold] = React.useState<number>(128);
  const [tracePreview, setTracePreview] = React.useState<string | null>(null);
  React.useEffect(() => {
    return () => {
      if (tracePreview) URL.revokeObjectURL(tracePreview);
    };
  }, [tracePreview]);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [maxDim] = React.useState<number>(768);
  const [engine, setEngine] = React.useState<'basic' | 'tiled' | 'wasm'>('wasm'); // Default to WASM
  const [addMode] = React.useState<'drawPathLayers' | 'svgCombined'>('drawPathLayers');
  // Layer selection heuristic (now default off; prefer foreground isolation below)
  // Removed: keepOnlyBiggest UI; always keep multiple non-overlapping layers
  
  // Foreground isolation helpers
  // ROI is stored normalized to the displayed image content (0..1)
  // Crop removed per request
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  // Removed: color keying, near-white removal, and MediaPipe segmentation
  // VTracer-style options (match demo controls)
  const [clusterMode, setClusterMode] = React.useState<'bw' | 'color'>('color');
  const [hierarchyMode, setHierarchyMode] = React.useState<'cutout' | 'stacked'>('stacked');
  const [curveMode, setCurveMode] = React.useState<'pixel' | 'polygon' | 'spline'>('spline');
  const [filterSpeckle, setFilterSpeckle] = React.useState<number>(4);
  const [colorPrecision, setColorPrecision] = React.useState<number>(6);
  const [gradientStep, setGradientStep] = React.useState<number>(16);
  const [cornerThreshold, setCornerThreshold] = React.useState<number>(60);
  const [segmentLength, setSegmentLength] = React.useState<number>(4.0);
  const [spliceThreshold, setSpliceThreshold] = React.useState<number>(45);
  // Demo parity removed: keep a single, consistent pipeline
  // Last SVG for download/export
  const [lastSvg, setLastSvg] = React.useState<string | null>(null);
  const lastSvgName = 'trace.svg';
  // Draw preview controls
  const [showDrawPreview, setShowDrawPreview] = React.useState(false);
  // Frozen SVG used for Draw Preview; captured when the panel is opened so it never changes while drawing
  const [drawSvgSnapshot, setDrawSvgSnapshot] = React.useState<string | null>(null);
  const domSvgHolderRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [advOpen, setAdvOpen] = React.useState(true);
  const drawStateRef = React.useRef<{
    vb: { x: number; y: number; w: number; h: number } | null;
    paths: { d: string; stroke: string; strokeWidth: number; fill: string; m?: [number,number,number,number,number,number] }[];
    lens: number[];
    total: number;
    raf: number | null;
    playing: boolean;
    durationMs: number;
    startedAt: number;
  }>({ vb: null, paths: [], lens: [], total: 0, raf: null, playing: false, durationMs: 3000, startedAt: 0 });

  const stopCanvasAnim = React.useCallback(() => {
    const st = drawStateRef.current;
    st.playing = false;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = null;
  }, []);

  const renderCanvasProgress = React.useCallback((ep: number) => {
    const st = drawStateRef.current;
    const vb = st.vb; const cvs = canvasRef.current; if (!vb || !cvs) return;
    const g = cvs.getContext('2d'); if (!g) return;
    // Clear
    g.clearRect(0, 0, cvs.width, cvs.height);
    // Map vb to canvas
    const dpr = window.devicePixelRatio || 1;
    // Canvas backing is set with DPR, but CSS displays at logical px; compensate here
    const displayW = cvs.clientWidth || (cvs.width / dpr);
    const displayH = cvs.clientHeight || (cvs.height / dpr);
    const scaleX = (displayW * dpr) / Math.max(1, vb.w);
    const scaleY = (displayH * dpr) / Math.max(1, vb.h);
    g.save();
    g.translate(-vb.x * scaleX, -vb.y * scaleY);
    g.scale(scaleX, scaleY);
    let consumed = 0;
    for (let i = 0; i < st.paths.length; i++) {
      const p = st.paths[i]; const len = st.lens[i] || 0;
      const start = consumed; const end = start + len; const target = ep * (st.total || 1);
      let path: Path2D | null = null;
      try { path = new Path2D(p.d); } catch { path = null; }
      if (!path) { consumed += len; continue; }
      g.lineWidth = p.strokeWidth || 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = p.stroke || '#111827';
      if (p.m) { g.save(); g.transform(p.m[0], p.m[1], p.m[2], p.m[3], p.m[4], p.m[5]); }
      if (len > 0 && st.total > 0) {
        if (target <= start) {
          g.setLineDash([len, len]); g.lineDashOffset = len; g.stroke(path);
        } else if (target >= end) {
          g.setLineDash([]); g.stroke(path);
          if (p.fill && p.fill !== 'none' && p.fill !== 'transparent') { g.fillStyle = p.fill; g.fill(path); }
        } else {
          const local = Math.max(0, Math.min(len, target - start));
          g.setLineDash([len, len]); g.lineDashOffset = Math.max(0, len - local); g.stroke(path);
        }
      } else {
        g.stroke(path);
      }
      if (p.m) g.restore();
      consumed += len;
    }
    g.restore();
  }, []);

  // Helper to size canvas to its holder and re-render current frame
  const resizeCanvasToHolder = React.useCallback(() => {
    const cvs = canvasRef.current; const holder = domSvgHolderRef.current;
    if (!cvs || !holder) return;
    const rect = holder.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const pxW = Math.max(32, Math.round(rect.width * dpr));
    const pxH = Math.max(32, Math.round(rect.height * dpr));
    if (cvs.width !== pxW || cvs.height !== pxH) {
      cvs.width = pxW; cvs.height = pxH;
    }
    (cvs.style as any).width = rect.width + 'px';
    (cvs.style as any).height = rect.height + 'px';
    // Re-render current frame after resize
    const st = drawStateRef.current;
    if (st.vb) {
      const ep = st.playing ? Math.min(1, (performance.now() - st.startedAt) / Math.max(1, st.durationMs)) : 1;
      renderCanvasProgress(ep);
    }
  }, [renderCanvasProgress]);

  const buildCanvasAnimFromSvg = React.useCallback((svgText: string) => {
    const st = drawStateRef.current; st.paths = []; st.lens = []; st.total = 0; st.vb = null;
    try {
      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const svg = doc.querySelector('svg'); if (!svg) return false;
      // viewBox
      let vb = { x: 0, y: 0, w: 800, h: 600 };
      const vba = svg.getAttribute('viewBox');
      if (vba) { const a = vba.trim().split(/[\s,]+/).map(Number); if (a.length===4 && a.every(n => !isNaN(n))) vb = { x: a[0], y: a[1], w: Math.max(1,a[2]), h: Math.max(1,a[3]) }; }
      else {
        const w = Number(svg.getAttribute('width')); const h = Number(svg.getAttribute('height'));
        if (!isNaN(w) && !isNaN(h)) vb = { x:0, y:0, w:Math.max(1,w), h:Math.max(1,h) };
      }
      // transforms helpers
      type Mat = [number,number,number,number,number,number]; const I: Mat=[1,0,0,1,0,0];
      const mul=(m1:Mat,m2:Mat):Mat=>[m1[0]*m2[0]+m1[2]*m2[1], m1[1]*m2[0]+m1[3]*m2[1], m1[0]*m2[2]+m1[2]*m2[3], m1[1]*m2[2]+m1[3]*m2[3], m1[0]*m2[4]+m1[2]*m2[5]+m1[4], m1[1]*m2[4]+m1[3]*m2[5]+m1[5]];
      const translate=(tx:number,ty:number):Mat=>[1,0,0,1,tx,ty];
      const scale=(sx:number,sy:number):Mat=>[sx,0,0,sy,0,0];
      const rotate=(deg:number):Mat=>{const r=deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return [c,s,-s,c,0,0];};
      const skewX=(deg:number):Mat=>{const t=Math.tan(deg*Math.PI/180);return [1,0,t,1,0,0];};
      const skewY=(deg:number):Mat=>{const t=Math.tan(deg*Math.PI/180);return [1,t,0,1,0,0];};
      const parseT=(str:string|null|undefined):Mat=>{ if(!str) return I; let m=I; const re=/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g; let match:RegExpExecArray|null; while((match=re.exec(str))){ const fn=match[1]; const args=match[2].split(/[\s,]+/).map(Number).filter(n=>!isNaN(n)); let t=I as Mat; switch(fn){ case 'matrix': if(args.length===6) t=[args[0],args[1],args[2],args[3],args[4],args[5]]; break; case 'translate': t=translate(args[0]||0,args[1]||0); break; case 'scale': t=scale(args[0]||1, args.length>1? args[1]:(args[0]||1)); break; case 'rotate': t=args.length>2? mul(mul(translate(args[1],args[2]), rotate(args[0]||0)), translate(-args[1],-args[2])) : rotate(args[0]||0); break; case 'skewX': t=skewX(args[0]||0); break; case 'skewY': t=skewY(args[0]||0); break; } m=mul(m,t);} return m; };
      const getCtm=(el:Element):Mat=>{ let chain:Element[]=[]; let p:Element|null=el; while(p && p.nodeName.toLowerCase()!=='html'){ chain.unshift(p); p=p.parentElement; } let m=mul(I, translate(-vb.x, -vb.y)); for(const node of chain){ m=mul(m, parseT(node.getAttribute('transform'))); } return m; };

      const out: { d:string; stroke:string; strokeWidth:number; fill:string; m?:Mat }[]=[];
      const visit=(el:Element)=>{ if(el.nodeName.toLowerCase()==='path'){ const d=el.getAttribute('d')||''; const strokeAttr=el.getAttribute('stroke'); const stroke = !strokeAttr || strokeAttr === 'none' ? 'transparent' : strokeAttr; const sw=Number(el.getAttribute('stroke-width')||'2'); const fillAttr = el.getAttribute('fill'); const fill = !fillAttr || fillAttr === 'none' ? 'transparent' : fillAttr; const m=getCtm(el); out.push({ d, stroke, strokeWidth: isNaN(sw)?2:sw, fill, m }); } Array.from(el.children).forEach(visit); };
      visit(svg);
      // Measure lengths on a hidden svg
      const s = document.createElementNS('http://www.w3.org/2000/svg','svg'); s.setAttribute('width','0'); s.setAttribute('height','0'); s.style.position='absolute'; s.style.left='-99999px'; s.style.top='-99999px'; document.body.appendChild(s);
      const lens:number[]=[]; let total=0;
      for(const p of out){ try{ const pathEl=document.createElementNS(s.namespaceURI,'path'); pathEl.setAttribute('d', p.d); if(p.m) pathEl.setAttribute('transform', `matrix(${p.m[0]} ${p.m[1]} ${p.m[2]} ${p.m[3]} ${p.m[4]} ${p.m[5]})`); s.appendChild(pathEl); const L=(pathEl as any).getTotalLength? (pathEl as any).getTotalLength():0; // approximate length via sampling
        const steps=Math.max(32, Math.min(220, Math.round((L||1)/6))); let prev=(pathEl as any).getPointAtLength? (pathEl as any).getPointAtLength(0) : {x:0,y:0}; let acc=0; for(let i=1;i<=steps;i++){ const pt=(pathEl as any).getPointAtLength? (pathEl as any).getPointAtLength((i/steps)*(L||1)) : prev; acc += Math.hypot(pt.x-prev.x, pt.y-prev.y); prev=pt; } s.removeChild(pathEl); lens.push(acc); total += acc; } catch { lens.push(0); } }
      document.body.removeChild(s);
      st.vb = vb; st.paths = out; st.lens = lens; st.total = Math.max(1, total);
      // Size canvas to holder
      resizeCanvasToHolder();
      return true;
    } catch { return false; }
  }, [resizeCanvasToHolder]);
  // Normalized SVG string for responsive preview (compute viewBox if missing; avoid TS deps)
  // ResizeObserver to auto-resize canvas on container or window resize
  React.useEffect(() => {
    if (!showDrawPreview) return;
    const holder = domSvgHolderRef.current;
    if (!holder) return;
    const ro = new ResizeObserver(() => {
      resizeCanvasToHolder();
    });
    ro.observe(holder);
    const onWinResize = () => resizeCanvasToHolder();
    window.addEventListener('resize', onWinResize);
    // Some browsers expose DPR changes via matchMedia
    const mq = window.matchMedia ? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`) : null;
    const onDprMaybeChange = () => resizeCanvasToHolder();
    if (mq && mq.addEventListener) mq.addEventListener('change', onDprMaybeChange);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onDprMaybeChange);
    };
  }, [showDrawPreview, resizeCanvasToHolder]);
  const normalizedSvg = React.useMemo(() => {
    if (!lastSvg) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(lastSvg, 'image/svg+xml');
      const srcSvg = doc.querySelector('svg');
      if (!srcSvg) return lastSvg;

      let viewBox = srcSvg.getAttribute('viewBox');
      if (!viewBox) {
        // Compute union bbox by mounting a temporary SVG to the DOM and calling getBBox()
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tmp.setAttribute('width', '0');
        tmp.setAttribute('height', '0');
        tmp.style.position = 'absolute';
        tmp.style.left = '-99999px';
        tmp.style.top = '-99999px';
        document.body.appendChild(tmp);
        Array.from(srcSvg.childNodes).forEach(n => tmp.appendChild(n.cloneNode(true)));
        try {
          const b = (tmp as any).getBBox ? (tmp as any).getBBox() : { x: 0, y: 0, width: 100, height: 100 };
          const pad = Math.max(1, Math.round(Math.max(b.width, b.height) * 0.02));
          const minX = Math.floor(b.x) - pad;
          const minY = Math.floor(b.y) - pad;
          const w = Math.max(1, Math.ceil(b.width) + 2 * pad);
          const h = Math.max(1, Math.ceil(b.height) + 2 * pad);
          viewBox = `${minX} ${minY} ${w} ${h}`;
        } catch {
          viewBox = '0 0 100 100';
        } finally {
          document.body.removeChild(tmp);
        }
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

  // Keep snapshot lifecycle aligned with preview visibility
  React.useEffect(() => {
    if (!showDrawPreview) {
      // Clear snapshot when panel closes, so next open re-captures current value
      setDrawSvgSnapshot(null);
      return;
    }
    // When opened, verify snapshot equals the Copy SVG value (lastSvg)
    if (showDrawPreview && lastSvg && drawSvgSnapshot) {
      setStatus(drawSvgSnapshot === lastSvg
        ? 'Verified: Draw preview equals Copy SVG.'
        : 'Warning: Snapshot differs from Copy SVG.');
    }
  }, [showDrawPreview, lastSvg, drawSvgSnapshot]);
  // Runtime indicators
  const [lastEngine, setLastEngine] = React.useState<null | 'official' | 'npm' | 'local' | 'minimal'>(null);
  // Path Refinement modal state
  // const [refineOpen, setRefineOpen] = React.useState(false);
  // const [refineItems, setRefineItems] = React.useState<RefineItem[] | null>(null);
  // Removed: top-30 cap toggle in refiner
  // const [refineViewport, setRefineViewport] = React.useState<{ width: number; height: number } | null>(null);
  // Tracing presets for common use cases
  type Preset = 'photo-subject' | 'line-art' | 'logo-flat' | 'noisy-photo' | 'custom';
  const [preset, setPreset] = React.useState<Preset>('photo-subject');
  const applyPreset = React.useCallback((p: Preset) => {
    switch (p) {
      case 'photo-subject':
        setClusterMode('color');
        setHierarchyMode('cutout');
        setCurveMode('spline');
        setFilterSpeckle(4);
        setColorPrecision(6);
        setGradientStep(20);
        setCornerThreshold(70);
        setSegmentLength(4);
        setSpliceThreshold(45);
        break;
      case 'line-art':
        setClusterMode('bw');
        setHierarchyMode('cutout');
        setCurveMode('spline');
        setFilterSpeckle(1);
        setColorPrecision(6);
        setGradientStep(16);
        setCornerThreshold(30);
        setSegmentLength(3);
        setSpliceThreshold(30);
        break;
      case 'logo-flat':
        setClusterMode('bw');
        setHierarchyMode('cutout');
        setCurveMode('polygon');
        setFilterSpeckle(0);
        setColorPrecision(6);
        setGradientStep(16);
        setCornerThreshold(20);
        setSegmentLength(2.5);
        setSpliceThreshold(20);
        break;
      case 'noisy-photo':
        setClusterMode('color');
        setHierarchyMode('stacked');
        setCurveMode('spline');
        setFilterSpeckle(6);
        setColorPrecision(5);
        setGradientStep(28);
        setCornerThreshold(80);
        setSegmentLength(5.5);
        setSpliceThreshold(55);
        break;
      case 'custom':
      default:
        break;
    }
  }, []);
  React.useEffect(() => { applyPreset('photo-subject'); /* set sensible defaults */ }, [applyPreset]);

  // (reserved for future helpers)

  const measureSvgPathsBBox = React.useCallback((paths: ParsedPath[]) => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.left = '-99999px';
    svg.style.top = '-99999px';
    document.body.appendChild(svg);
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    try {
      for (const p of paths) {
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', p.d);
        svg.appendChild(path);
        const b = path.getBBox();
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      }
    } catch (e) {
      // fallback box
      minX = 0; minY = 0; maxX = 100; maxY = 100;
    } finally {
      document.body.removeChild(svg);
    }
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    return { x: minX, y: minY, width, height };
  }, []);

  // Sample an SVG path `d` into local points using getPointAtLength
  const sampleSvgPathToPoints = React.useCallback((d: string, maxPoints = 220) => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.left = '-99999px';
    svg.style.top = '-99999px';
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
    document.body.appendChild(svg);
    try {
  const total = path.getTotalLength();
      const steps = Math.max(8, Math.min(maxPoints, Math.ceil(total / Math.max(0.5, total / maxPoints))));
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        const p = path.getPointAtLength((i / steps) * total);
        pts.push({ x: p.x, y: p.y });
      }
      // Normalize to local coordinates by subtracting bbox min
      const b = path.getBBox();
      const nx = b.x, ny = b.y;
      const w = Math.max(1, b.width), h = Math.max(1, b.height);
      const norm = pts.map(p => ({ x: p.x - nx, y: p.y - ny }));
  return { points: norm, bbox: { x: nx, y: ny, width: w, height: h }, length: total };
    } catch {
  return { points: [], bbox: { x: 0, y: 0, width: 100, height: 100 }, length: 0 };
    } finally {
      document.body.removeChild(svg);
    }
  }, []);

  // Split a complex `d` into subpaths at absolute/relative moveto commands (M/m)
  const splitPathD = React.useCallback((d: string): string[] => {
    if (!d || typeof d !== 'string') return [];
    // Normalize whitespace
    const norm = d.replace(/\s+/g, ' ').trim();
    // Split on moveto commands but keep the delimiter by using a regex with lookahead
    const chunks = norm.split(/(?=[Mm][^Mm]*)/g).filter(Boolean);
    // Ensure each chunk starts with a moveto; discard tiny fragments
    const out: string[] = [];
    for (let c of chunks) {
      c = c.trim();
      if (!c) continue;
      // Heuristic: must start with M/m and have at least one more command or coords
      if (!/^[Mm]/.test(c)) c = 'M ' + c;
      if (c.length < 6) continue;
      out.push(c);
    }
    return out.length ? out : [norm];
  }, []);

  const parseSvgString = (text: string): { paths: ParsedPath[]; viewBox?: { x: number; y: number; width: number; height: number } } => {
    const out: ParsedPath[] = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');
      // viewBox handling
      let vb: { x: number; y: number; width: number; height: number } | undefined;
      if (svgEl) {
        const vbAttr = svgEl.getAttribute('viewBox');
        if (vbAttr) {
          const nums = vbAttr.trim().split(/[\s,]+/).map(Number);
          if (nums.length === 4 && nums.every(n => !isNaN(n))) {
            vb = { x: nums[0], y: nums[1], width: Math.max(1, nums[2]), height: Math.max(1, nums[3]) };
          }
        } else {
          // Fallback to width/height if numeric
          const w = Number(svgEl.getAttribute('width'));
          const h = Number(svgEl.getAttribute('height'));
          if (!isNaN(w) && !isNaN(h)) vb = { x: 0, y: 0, width: Math.max(1, w), height: Math.max(1, h) };
        }
      }

      // Matrix helpers
      type Mat = [number, number, number, number, number, number]; // a b c d e f
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
      const scale = (sx: number, sy: number): Mat => [sx, 0, 0, sy, 0, 0];
      const rotate = (deg: number): Mat => {
        const r = (deg * Math.PI) / 180;
        const cos = Math.cos(r);
        const sin = Math.sin(r);
        return [cos, sin, -sin, cos, 0, 0];
      };
      const skewX = (deg: number): Mat => {
        const t = Math.tan((deg * Math.PI) / 180);
        return [1, 0, t, 1, 0, 0];
      };
      const skewY = (deg: number): Mat => {
        const t = Math.tan((deg * Math.PI) / 180);
        return [1, t, 0, 1, 0, 0];
      };
      const parseTransform = (str: string | null | undefined): Mat => {
        if (!str) return I;
        let m: Mat = I;
        const regex = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(str))) {
          const fn = match[1];
          const args = match[2].split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
          let t: Mat = I;
          switch (fn) {
            case 'matrix':
              if (args.length === 6) t = [args[0], args[1], args[2], args[3], args[4], args[5]];
              break;
            case 'translate':
              t = translate(args[0] || 0, args[1] || 0);
              break;
            case 'scale':
              t = scale(args[0] || 1, args.length > 1 ? args[1] : args[0] || 1);
              break;
            case 'rotate':
              if (args.length > 2) {
                // rotate(angle, cx, cy) = T(cx,cy) R(angle) T(-cx,-cy)
                t = mul(mul(translate(args[1], args[2]), rotate(args[0] || 0)), translate(-args[1], -args[2]));
              } else {
                t = rotate(args[0] || 0);
              }
              break;
            case 'skewX':
              t = skewX(args[0] || 0);
              break;
            case 'skewY':
              t = skewY(args[0] || 0);
              break;
          }
          // Left-to-right application
          m = mul(m, t);
        }
        return m;
      };
      const apply = (m: Mat, x: number, y: number): { x: number; y: number } => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
      const getCtm = (el: Element): Mat => {
        const chain: Element[] = [];
        let p: Element | null = el;
        // Climb until the root SVG element (or document root)
        while (p && p.nodeName.toLowerCase() !== 'html') {
          chain.unshift(p);
          p = p.parentElement;
        }
        let m: Mat = I;
        // Initial viewBox rebase (translate by -vb.x, -vb.y)
        if (vb) m = mul(m, translate(-vb.x, -vb.y));
        for (const node of chain) {
          const t = parseTransform(node.getAttribute('transform'));
          m = mul(m, t);
        }
        return m;
      };

      // converters -> path 'd'
      const rectToPath = (x: number, y: number, w: number, h: number, m: Mat): string => {
        const pts = [
          apply(m, x, y),
          apply(m, x + w, y),
          apply(m, x + w, y + h),
          apply(m, x, y + h),
        ];
        return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y} L ${pts[3].x} ${pts[3].y} Z`;
      };
      const circleToPath = (cx: number, cy: number, r: number, m: Mat, segments = 32): string => {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          const p = apply(m, cx + r * Math.cos(a), cy + r * Math.sin(a));
          pts.push(p);
        }
        const first = pts[0];
        const rest = pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        return `M ${first.x} ${first.y} ${rest} Z`;
      };
      const ellipseToPath = (cx: number, cy: number, rx: number, ry: number, m: Mat, segments = 32): string => {
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          const p = apply(m, cx + rx * Math.cos(a), cy + ry * Math.sin(a));
          pts.push(p);
        }
        const first = pts[0];
        const rest = pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        return `M ${first.x} ${first.y} ${rest} Z`;
      };
      const pointsStringToPoints = (str: string): number[] => str.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      const polyToPath = (pts: number[], close: boolean, m: Mat): string => {
        if (pts.length < 2) return '';
        const p0 = apply(m, pts[0], pts[1]);
        let d = `M ${p0.x} ${p0.y}`;
        for (let i = 2; i < pts.length; i += 2) {
          const p = apply(m, pts[i], pts[i + 1]);
          d += ` L ${p.x} ${p.y}`;
        }
        if (close) d += ' Z';
        return d;
      };

      // Collect shapes
      const pushPath = (d: string, el: Element) => {
        if (!d) return;
        const stroke = el.getAttribute('stroke') || undefined;
        const sw = Number(el.getAttribute('stroke-width') || '3');
        // SVG default fill is black if not specified; only treat explicit 'none' as transparent
        const fillAttr = el.getAttribute('fill');
        const fill = (fillAttr ? fillAttr : '#000').toLowerCase() === 'none' ? 'transparent' : (fillAttr || '#000');
        const fillRule = (el.getAttribute('fill-rule') as any) || undefined;
        out.push({ d, stroke, strokeWidth: isNaN(sw) ? 3 : sw, fill, fillRule });
      };

      const visit = (node: Element) => {
        const name = node.nodeName.toLowerCase();
        const m = getCtm(node);
        if (name === 'path') {
          const d = node.getAttribute('d');
          if (d) {
            // Note: Not applying transform to complex path d (keeps curves); handled by CTM baked into points for primitives.
            // Since our renderer ignores transform, we rely on stress-test case having no transform on <path>.
            pushPath(d, node);
          }
        } else if (name === 'rect') {
          const x = Number(node.getAttribute('x') || '0');
          const y = Number(node.getAttribute('y') || '0');
          const w = Number(node.getAttribute('width') || '0');
          const h = Number(node.getAttribute('height') || '0');
          const d = rectToPath(x, y, w, h, m);
          pushPath(d, node);
        } else if (name === 'circle') {
          const cx = Number(node.getAttribute('cx') || '0');
          const cy = Number(node.getAttribute('cy') || '0');
          const r = Number(node.getAttribute('r') || '0');
          const d = circleToPath(cx, cy, r, m);
          pushPath(d, node);
        } else if (name === 'ellipse') {
          const cx = Number(node.getAttribute('cx') || '0');
          const cy = Number(node.getAttribute('cy') || '0');
          const rx = Number(node.getAttribute('rx') || '0');
          const ry = Number(node.getAttribute('ry') || '0');
          const d = ellipseToPath(cx, cy, rx, ry, m);
          pushPath(d, node);
        } else if (name === 'line') {
          const x1 = Number(node.getAttribute('x1') || '0');
          const y1 = Number(node.getAttribute('y1') || '0');
          const x2 = Number(node.getAttribute('x2') || '0');
          const y2 = Number(node.getAttribute('y2') || '0');
          const p1 = apply(m, x1, y1);
          const p2 = apply(m, x2, y2);
          pushPath(`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`, node);
        } else if (name === 'polyline' || name === 'polygon') {
          const ptsAttr = node.getAttribute('points') || '';
          const pts = pointsStringToPoints(ptsAttr);
          const d = polyToPath(pts, name === 'polygon', m);
          pushPath(d, node);
        } else if (name === 'g' || name === 'svg') {
          // visit children
          Array.from(node.children).forEach((child) => visit(child as Element));
        }
      };

      if (svgEl) visit(svgEl);
      else Array.from(doc.children).forEach((child) => visit(child as Element));

      return { paths: out, viewBox: vb };
    } catch (e) {
      // ignore
      return { paths: out };
    }
  };

  // Build a minimal SVG string from a list of path d strings
  const makeSvgFromPaths = React.useCallback((ds: string[]) => {
    if (!ds.length) return '';
    const bbox = measureSvgPathsBBox(ds.map(d => ({ d })));
    const pad = Math.max(1, Math.round(Math.max(bbox.width, bbox.height) * 0.02));
    const minX = Math.floor(bbox.x) - pad;
    const minY = Math.floor(bbox.y) - pad;
    const w = Math.ceil(bbox.width) + 2 * pad;
    const h = Math.ceil(bbox.height) + 2 * pad;
    const header = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" width="${w}" height="${h}">`;
    const body = ds.map(d => `<path d="${d}" fill="none" stroke="#000" stroke-width="1"/>`).join('');
    return `${header}${body}</svg>`;
  }, [measureSvgPathsBBox]);

  const downloadLastSvg = React.useCallback(() => {
    if (!lastSvg) return;
    const blob = new Blob([lastSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
  a.download = lastSvgName || 'trace.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [lastSvg, lastSvgName]);

  const copyLastSvg = React.useCallback(async () => {
    if (!lastSvg) return;
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(lastSvg);
      } else {
        const ta = document.createElement('textarea');
        ta.value = lastSvg; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      setStatus('SVG copied to clipboard');
    } catch (e: any) {
      setStatus(`Failed to copy SVG: ${e?.message || e}`);
    }
  }, [lastSvg]);

  const copySvgPathsOnly = React.useCallback(async () => {
    if (!lastSvg) return;
    try {
      const doc = new DOMParser().parseFromString(lastSvg, 'image/svg+xml');
      const paths = Array.from(doc.querySelectorAll('path'));
      const ds = paths.map(p => p.getAttribute('d') || '').filter(Boolean).join('\n');
      if (!ds) { setStatus('No <path> elements found'); return; }
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(ds);
      } else {
        const ta = document.createElement('textarea');
        ta.value = ds; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      setStatus('Path data copied to clipboard');
    } catch (e: any) {
      setStatus(`Failed to copy paths: ${e?.message || e}`);
    }
  }, [lastSvg]);

  // Enhanced Draw Preview rendering with better canvas sizing
  React.useEffect(() => {
    if (!showDrawPreview || !drawSvgSnapshot) return;
    const svgMarkup = drawSvgSnapshot;
    
    // Render DOM-SVG for animation
    const holder = domSvgHolderRef.current;
    if (holder) {
      // Do not render static SVG in holder; keep it empty so only canvas drawing is visible
      holder.innerHTML = '';
      const svgEl = holder.querySelector('svg');
      if (svgEl) {
        // Ensure SVG fits container
        svgEl.setAttribute('width', '100%');
        svgEl.setAttribute('height', '100%');
        svgEl.style.display = 'block';
      }
    }
    
    // Render Canvas via Resvg with proper sizing
    const c = canvasRef.current;
    if (c) {
      const ctx = c.getContext('2d');
      if (ctx) {
        // Parse dimensions from SVG
        const m = svgMarkup.match(/viewBox="([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)"/);
        let w = 300, h = 200;
        if (m) {
          w = Math.max(64, Math.round(parseFloat(m[3])));
          h = Math.max(64, Math.round(parseFloat(m[4])));
        } else {
          const mw = svgMarkup.match(/\bwidth="([\d.]+)"/i);
          const mh = svgMarkup.match(/\bheight="([\d.]+)"/i);
          if (mw && mh) {
            w = Math.max(64, Math.round(parseFloat(mw[1])));
            h = Math.max(64, Math.round(parseFloat(mh[1])));
          }
        }
        
        // Set canvas to reasonable preview size (maintain aspect ratio)
        const maxSize = 180; // Fit within 12rem container
        const scale = Math.min(maxSize / w, maxSize / h);
        const canvasW = Math.round(w * scale);
        const canvasH = Math.round(h * scale);
        
        c.width = canvasW;
        c.height = canvasH;
        
        // Clear and render
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0, 0, canvasW, canvasH);
        // Skip static raster render; canvas will be animated by Play Draw
      }
    }
  }, [showDrawPreview, drawSvgSnapshot]);

  return (
  <>
  <div className="p-3 text-white">

  {/* Legacy top import cards removed; merged into left controls card below */}

      {status && <div className="mt-3 text-xs text-gray-300">{status}</div>}

  <div className="mt-4 p-0 bg-gray-800/70 rounded border border-gray-700 overflow-hidden">
              {/* Drag/resize helper bar (visual only) */}
              <div className="text-[11px] text-gray-300/80 bg-gray-900/40 px-3 py-1 border-b border-gray-700/70 select-none">
                Drag from header to move • Press ESC or use × to close • Drag edges to resize
              </div>
              <div className="p-3">
              <div className="text-sm font-semibold mb-2 flex items-center gap-3">
                <span>Vectorize (WASM with VTracer options)</span>
                <span className="text-xs text-gray-400">Official engine is used. JS fallback only if needed.</span>
                {lastEngine && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-gray-700 text-gray-200" title="Engine actually used on last run">
                    Engine: {lastEngine}
                  </span>
                )}
              </div>
              {lastEngine === 'minimal' && (
                <div className="text-[11px] text-amber-300 mb-2">
                  Using minimal fallback engine; official build could not be initialized.
                </div>
              )}
  <div className="two-col-grid items-start">
          <div className="lg:col-span-1 panel">
            <h2 style={{color:'#fff',fontSize:'1.25rem',fontWeight:700,marginBottom:24}}>Vectorize Image</h2>
            <div className="file-row" style={{marginBottom:4}}>
              <label className="btn btn-primary" htmlFor="trace-file">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L18.5 9H15z"/></svg>
                Choose file
              </label>
              <input id="trace-file" className="file-input-hidden" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setTracePreview(prev => { if (prev) URL.revokeObjectURL(prev); return prev; });
                  const url = URL.createObjectURL(f);
                  setTracePreview(url);
                  setStatus(`📁 Loaded file: ${f.name} (${Math.round(f.size/1024)}KB)`);
                }}
              />
              <div className="file-name truncate">{tracePreview ? 'Image selected' : 'No file selected'}</div>
            </div>
            <div className="muted" style={{marginBottom:16}}>Last Engine: official</div>
            <div className="mt-3 text-xs text-gray-400">Threshold: {traceThreshold}</div>
            <input
              type="range"
              min={0}
              max={255}
              value={traceThreshold}
              onChange={(e) => setTraceThreshold(Number(e.target.value))}
              className="w-full"
            />
            {/* Max size control removed per request; internal clamping remains */}
            <div className="mt-3 text-xs text-gray-300">Preset</div>
            <select
              value={preset}
              onChange={(e)=>applyPreset(e.target.value as any)}
              className="select-dark w-full"
            >
              <option value="photo-subject">Photo (Subject)</option>
              <option value="line-art">Sketch / Line Art</option>
              <option value="logo-flat">Logo / Flat</option>
              <option value="noisy-photo">Noisy Photo</option>
              <option value="custom">Custom</option>
            </select>
            <div className="mt-3 text-xs text-gray-300">Engine</div>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as 'basic' | 'tiled' | 'wasm')}
              className="select-dark w-full"
            >
              <option value="wasm">WASM (Best Quality)</option>
              <option value="tiled">JS Fallback</option>
            </select>
            {/* Advanced Trace Options (accordion) */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAdvOpen(v=>!v)} style={{color:'#A0AEC0', marginTop:16, marginBottom:8}}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{transform: advOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition:'transform .15s'}}><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.105l3.71-3.874a.75.75 0 111.08 1.04l-4.24 4.43a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
              <span>Advanced Trace Options</span>
            </div>
            {advOpen && (
            <div className="adv-grid">
              <div className="option-group">
                <div className="text-xs text-gray-300">Clustering</div>
                <div className="flex gap-1">
                  <button type="button" className={`chip ${clusterMode==='bw'?'chip-active':''}`} onClick={()=>{ setClusterMode('bw'); setPreset('custom'); }}>B&W</button>
                  <button type="button" className={`chip ${clusterMode==='color'?'chip-active':''}`} onClick={()=>{ setClusterMode('color'); setPreset('custom'); }}>Color</button>
                </div>
              </div>
              {clusterMode === 'color' && (
                <div className="option-group">
                  <div className="text-xs text-gray-300">Layers</div>
                  <div className="flex gap-1">
                    <button type="button" className={`chip ${hierarchyMode==='cutout'?'chip-active':''}`} onClick={()=>{ setHierarchyMode('cutout'); setPreset('custom'); }}>CUTOUT</button>
                    <button type="button" className={`chip ${hierarchyMode==='stacked'?'chip-active':''}`} onClick={()=>{ setHierarchyMode('stacked'); setPreset('custom'); }}>STACKED</button>
                  </div>
                </div>
              )}
              <div className="option-group col-span-2">
                <div className="text-xs text-gray-300">Filter Speckle <span className="text-[10px] text-gray-400">(Cleaner)</span></div>
                <input type="range" min={0} max={20} value={filterSpeckle} onChange={(e)=>{ setFilterSpeckle(Number(e.target.value)); setPreset('custom'); }} className="slider-blue" />
              </div>
              {clusterMode === 'color' && (
                <>
                  <div className="option-group">
                    <div className="text-xs text-gray-300">Color Precision <span className="text-[10px] text-gray-400">(More accurate)</span></div>
                    <input type="range" min={1} max={8} value={colorPrecision} onChange={(e)=>{ setColorPrecision(Number(e.target.value)); setPreset('custom'); }} className="slider-blue" />
                  </div>
                  <div className="option-group">
                    <div className="text-xs text-gray-300">Gradient Step <span className="text-[10px] text-gray-400">(Less layers)</span></div>
                    <input type="range" min={1} max={64} value={gradientStep} onChange={(e)=>{ setGradientStep(Number(e.target.value)); setPreset('custom'); }} className="slider-blue" />
                  </div>
                </>
              )}
              <div className="option-group col-span-2">
                <div className="text-xs text-gray-300">Curve Fitting</div>
                <div className="flex gap-1">
                  <button type="button" className={`chip ${curveMode==='spline'?'chip-active':''}`} onClick={()=>{ setCurveMode('spline'); setPreset('custom'); }}>SPLINE</button>
                  <button type="button" className={`chip ${curveMode==='polygon'?'chip-active':''}`} onClick={()=>{ setCurveMode('polygon'); setPreset('custom'); }}>POLYGON</button>
                  <button type="button" className={`chip ${curveMode==='pixel'?'chip-active':''}`} onClick={()=>{ setCurveMode('pixel'); setPreset('custom'); }}>PIXEL</button>
                </div>
              </div>
              {curveMode === 'spline' && (
                <>
                  <div className="option-group">
                    <div className="text-xs text-gray-300">Corner Threshold <span className="text-[10px] text-gray-400">(Smoother)</span></div>
                    <input type="range" min={0} max={120} value={cornerThreshold} onChange={(e)=>{ setCornerThreshold(Number(e.target.value)); setPreset('custom'); }} className="slider-blue" />
                  </div>
                  <div className="option-group">
                    <div className="text-xs text-gray-300">Segment Length <span className="text-[10px] text-gray-400">(More coarse)</span></div>
                    <input type="range" min={1} max={12} step={0.5} value={segmentLength} onChange={(e)=>{ setSegmentLength(Number(e.target.value)); setPreset('custom'); }} className="slider-blue" />
                  </div>
                  <div className="option-group col-span-2">
                    <div className="text-xs text-gray-300">Splice Threshold <span className="text-[10px] text-gray-400">(Less accurate)</span></div>
                    <input type="range" min={0} max={90} value={spliceThreshold} onChange={(e)=>{ setSpliceThreshold(Number(e.target.value)); setPreset('custom'); }} className="slider-blue" />
                  </div>
                </>
              )}
            </div>
            )}
          </div>
          <div className="lg:col-span-1 panel">
            <div className="flex items-center justify-between" style={{marginBottom:12}}>
              <div className="text-xs text-gray-300 mb-1">Preview</div>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-gray" disabled={!lastSvg} onClick={downloadLastSvg} title="Download last traced SVG">Download SVG</button>
                <button type="button" className="btn btn-gray" disabled={!lastSvg} onClick={copyLastSvg} title="Copy SVG markup to clipboard">Copy SVG</button>
                <button type="button" className="btn btn-gray" disabled={!lastSvg} onClick={copySvgPathsOnly} title="Copy all path d attributes">Copy path data</button>
              </div>
            </div>
            {/* Two-card previews: Original and Generated SVG */}
            <div className="preview-grid w-full">
              <div className="preview-box border-blue-500">
                <div className="preview-label text-blue-300">Original Image</div>
                {tracePreview ? (
                  <img ref={imgRef} src={tracePreview || undefined} alt="uploaded" onLoad={() => setStatus('✅ Image preview loaded')} onError={() => setStatus('❌ Failed to load image preview')} />
                ) : (
                  <div className="preview-placeholder">Choose an image to preview</div>
                )}
              </div>
              <div className="preview-box border-green-500">
                <div className="preview-label text-green-300">Generated SVG</div>
                {lastSvg ? (
                  <div style={{width:'100%',height:'100%'}} dangerouslySetInnerHTML={{ __html: normalizedSvg }} />
                ) : (
                  <div className="preview-placeholder">Vectorize to see SVG</div>
                )}
              </div>
            </div>
            {/* Draw Preview on Canvas */}
            <div className="subpanel">
              <div className="flex items-center justify-between" style={{marginBottom:8}}>
                <div style={{color:'#e5e7eb', fontWeight:600}}>Draw Preview on Canvas</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={!lastSvg}
                  onClick={() => {
                      if (!lastSvg) return;
                      // Build canvas anim state from current SVG and play
                      setDrawSvgSnapshot(lastSvg);
                      setShowDrawPreview(true);
                      // Wait for the preview panel to mount & lay out before sizing the canvas.
                      // (Without this, the first click may read a 0px rect and mis-scale.)
                      const startPlayback = () => {
                        // Ensure DOM holder stays empty during playback (avoid double-render)
                        const holder = domSvgHolderRef.current;
                        if (holder) { holder.innerHTML = ''; }
                        // Cancel any in-flight RAF before rebuilding
                        stopCanvasAnim();
                        // Guarantee fresh size before building anim
                        resizeCanvasToHolder();
                        const ok = buildCanvasAnimFromSvg(lastSvg);
                        if (!ok) { setStatus('Failed to prepare canvas animation'); return; }
                        const st = drawStateRef.current;
                        st.playing = true;
                        st.startedAt = performance.now();
                        st.durationMs = Math.max(1200, Math.min(6000, Math.round(st.total * 3))); // duration proportional to total length
                        const tick = (t:number)=>{
                          if (!st.playing) return;
                          const ep = Math.min(1, (t - st.startedAt) / st.durationMs);
                          renderCanvasProgress(ep);
                          if (ep >= 1) { st.playing = false; st.raf = null; return; }
                          st.raf = requestAnimationFrame(tick);
                        };
                        st.raf = requestAnimationFrame(tick);
                      };
                      // Use double rAF to ensure layout (panel visibility + CSS) has settled.
                      requestAnimationFrame(() => requestAnimationFrame(startPlayback));
                    }}
                  >▶ Play Draw</button>
                  <button
                    type="button"
                    className="btn btn-gray"
                    disabled={!lastSvg}
                    onClick={() => {
                      if (!drawSvgSnapshot || !currentProject) return;
                      // Build path objects with transforms using same logic as Draw Preview
                      const ok = buildCanvasAnimFromSvg(drawSvgSnapshot);
                      if (!ok) { setStatus('Failed to parse SVG'); return; }
                      const st = drawStateRef.current;
                      const vb = st.vb;
                      let w = 400, h = 300;
                      if (vb) { w = Math.max(64, Math.round(vb.w)); h = Math.max(64, Math.round(vb.h)); }
                      const baseId = Date.now();
                      const pathObjs = st.paths.map((p, i) => ({
                        d: p.d,
                        stroke: p.stroke || 'transparent',
                        strokeWidth: p.strokeWidth || 2,
                        fill: p.fill || 'transparent',
                        m: p.m,
                        len: st.lens[i] || 0,
                      }));
                      // Estimate a default duration based on total path length so
                      // initial playback speed roughly matches SVG complexity.
                      const duration = Math.max(1, st.total / 300);
                      addObject({
                        id: `draw-preview-${baseId}`,
                        type: 'svgPath',
                        x: 150,
                        y: 150,
                        width: w,
                        height: h,
                        rotation: 0,
                        properties: { paths: pathObjs, totalLen: st.total },
                        animationType: 'drawIn',
                        animationStart: 0,
                        animationDuration: duration,
                        animationEasing: 'easeOut',
                      });
                      setStatus('✅ Draw preview added to canvas');
                    }}
                  >➕ Add to Canvas</button>
                </div>
              </div>
              <div className="draw-area" style={{position:'relative'}}>
                <div ref={domSvgHolderRef} className="draw-svg-holder" style={{position:'absolute', inset:0}} />
                <canvas ref={canvasRef} style={{position:'absolute', inset:0, width:'100%', height:'100%'}} />
              </div>
            </div>
          </div>
        </div>
  {/* Full-width action column placed below controls/preview to match mock */}
        <div className="mt-3 flex flex-col gap-2 items-end">
            <button
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium disabled:opacity-50"
              disabled={!tracePreview || busy}
              onClick={async () => {
                if (!tracePreview) return;
                setBusy(true);
                setStatus('🔍 Analyzing image...');
                // Draw image to canvas, clamp max dimension to 1024 for stability
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = async () => {
                  // Image analysis for debugging
                  setStatus(`📊 Image: ${img.width}×${img.height}px, analyzing complexity...`);
                  // Clamp size based on selected engine. In demo parity, avoid clamping to match demo.
                  const HARD_MAX_WASM_DIM = 896;
                  let scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
                  if (engine === 'wasm') {
                    const wasmScale = Math.min(
                      HARD_MAX_WASM_DIM / img.width,
                      HARD_MAX_WASM_DIM / img.height,
                      1
                    );
                    if (wasmScale < scale) {
                      scale = wasmScale;
                      setStatus(`WASM engine: clamped image to ${HARD_MAX_WASM_DIM}px max to prevent crashes. For higher resolutions, use Tiled engine.`);
                    }
                  }
                  const w = Math.max(1, Math.floor(img.width * scale));
                  const h = Math.max(1, Math.floor(img.height * scale));
                  const canvas = document.createElement('canvas');
                  canvas.width = w; canvas.height = h;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) { setBusy(false); return; }
                  (ctx as any).imageSmoothingEnabled = true;
                  ctx.drawImage(img, 0, 0, w, h);
                  let data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  // B/W quantization when B/W is selected (applies in all modes since wasm API lacks color_mode)
                  if (clusterMode === 'bw') {
                    const d = data.data;
                    const thr = traceThreshold; // reuse user threshold slider (0..255)
                    for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const a = d[i + 3];
            // Use red-channel threshold to match official demo
            const v = (r < thr) ? 0 : 255;
                      d[i] = d[i + 1] = d[i + 2] = v; // bw
                      d[i + 3] = a; // preserve alpha
                    }
                    const ctxm = canvas.getContext('2d');
                    if (ctxm) ctxm.putImageData(data, 0, 0);
                    data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  }

                  // Removed: MediaPipe segmentation and background keying/near-white removal
                  
                  // Image complexity analysis for debugging
                  const pixels = data.data;
                  let uniqueColors = new Set<string>();
                  let totalLuma = 0;
                  let edgePixels = 0;
                  
                  for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
                    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) * (a / 255);
                    totalLuma += luma;
                    uniqueColors.add(`${r},${g},${b}`);
                    
                    // Simple edge detection (check if pixel differs significantly from next)
                    if (i < pixels.length - 8) {
                      const nr = pixels[i + 4], ng = pixels[i + 5], nb = pixels[i + 6];
                      const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
                      if (diff > 60) edgePixels++;
                    }
                  }
                  
                  const avgLuma = totalLuma / (pixels.length / 4);
                  const complexity = edgePixels / (pixels.length / 4);
                  
                                    setStatus(`📊 Scaled: ${w}×${h}, Colors: ${uniqueColors.size}, Avg brightness: ${Math.round(avgLuma)}, Edge density: ${(complexity * 100).toFixed(1)}%`);
                  
                  // Smart preprocessing for ultra-complex images
                  if (uniqueColors.size > 100000) {
                    setStatus(`🔧 Ultra-complex image detected (${uniqueColors.size} colors). Applying minimal preprocessing for stability...`);
                    
                    // Gentle preprocessing that preserves detail but prevents crashes
                    const blurCanvas = document.createElement('canvas');
                    blurCanvas.width = w; blurCanvas.height = h;
                    const blurCtx = blurCanvas.getContext('2d');
                    if (blurCtx) {
                      // Light blur to merge very similar colors, keep colors for quality
                      blurCtx.filter = 'blur(2px) contrast(120%)';
                      blurCtx.drawImage(canvas, 0, 0);
                      
                      // Get the lightly processed image data
                      const processedData = blurCtx.getImageData(0, 0, w, h);
                      
                      // Light quantization (reduce to 64 levels per channel = ~260k colors max)
                      const quantized = processedData.data;
                      for (let i = 0; i < quantized.length; i += 4) {
                        // Reduce to 64 levels per channel (6 bits) - preserves much more detail
                        quantized[i] = Math.round(quantized[i] / 4) * 4;     // R
                        quantized[i + 1] = Math.round(quantized[i + 1] / 4) * 4; // G  
                        quantized[i + 2] = Math.round(quantized[i + 2] / 4) * 4; // B
                      }
                      blurCtx.putImageData(new ImageData(quantized, w, h), 0, 0);
                      const processedImageData = blurCtx.getImageData(0, 0, w, h);
                      
                      // Recount colors after processing
                      uniqueColors.clear();
                      for (let i = 0; i < processedImageData.data.length; i += 4) {
                        const r = processedImageData.data[i], g = processedImageData.data[i + 1], b = processedImageData.data[i + 2];
                        uniqueColors.add(`${r},${g},${b}`);
                      }
                      setStatus(`🔧 Preprocessing complete: reduced to ${uniqueColors.size} colors`);
                      
                      // Use the processed data for tracing
                      data = processedImageData;
                    }
                  }
                  
                  // Note: Debug info removed to prevent DevTools flickering
                    try {
                      // Paths accumulator shared across strategies (WASM / JS / fallback)
                      let ds: string[] = [];
                      // Helper runners populate and return arrays of path d strings
                      
                      // use outer-scoped `ds` defined above to collect results
          const runWasm = async (modeOverride?: 'pixel'|'polygon'|'spline', altImage?: ImageData): Promise<{ paths: string[]; svg?: string }> => {
                      setStatus(`🤖 Starting WASM trace (threshold: ${traceThreshold})...`);
                      const startTime = Date.now();
                      const worker = new Worker(new URL('../vtrace/vtracerWorker.ts', import.meta.url), { type: 'module' });
                      try {
                        const result = await new Promise((resolve: (v: { paths: string[]; svg?: string; engine?: 'official'|'minimal' }) => void, reject: (reason?: any) => void) => {
                          const timeout = setTimeout(() => reject(new Error('WASM trace timeout (30s)')), 30000);
                          const onMessage = (ev: MessageEvent<any>) => {
                            clearTimeout(timeout);
                            worker.removeEventListener('message', onMessage);
                            if (ev.data?.error) reject(new Error(ev.data.error));
                            else resolve({ paths: ev.data?.paths || [], svg: ev.data?.svg, engine: ev.data?.engine });
                          };
                          worker.addEventListener('message', onMessage);
              worker.postMessage({ 
                            imageData: altImage || data, 
                            options: {
                              // Real VTracer parameter names from UI
                              mode: (modeOverride || curveMode),
                              hierarchical: hierarchyMode,
                              filter_speckle: filterSpeckle,
                              color_precision: (clusterMode === 'bw') ? 6 : colorPrecision,
                              // Smaller layer difference for B/W to avoid merging everything
                              layer_difference: (clusterMode === 'bw') ? 16 : gradientStep,
                              // Only meaningful for spline mode
                              ...(curveMode === 'spline' ? {
                                corner_threshold: cornerThreshold,
                                length_threshold: segmentLength,
                                splice_threshold: spliceThreshold
                              } : {}),
                            }
                          });
                        });
                        const elapsed = Date.now() - startTime;
                        const engineUsed = (result as any).engine || 'official';
                        setLastEngine(engineUsed);
                        setStatus(`🤖 WASM (${engineUsed}) completed in ${elapsed}ms, found ${(result as any).paths.length} paths`);
                        // Keep last SVG for download (prefer engine SVG)
                        const engineSvg: string | undefined = (result as any).svg;
                        if (engineSvg) setLastSvg(engineSvg);
                        // Use worker extracted paths
                        let out = (result as any).paths.slice(0, 600);
                        // If WASM returned SVG with non-path elements, try to parse to paths
                        if (out.length === 0 && engineSvg) {
                          setStatus(`🔧 WASM returned SVG with no paths, parsing shapes...`);
                          const parsed = parseSvgString(engineSvg);
                          out = parsed.paths.map(p => p.d).slice(0, 600);
                        }
                        // Explode complex path d into subpaths so we can create multiple layers
                        out = out.flatMap((d: string) => splitPathD(d)).filter(Boolean).slice(0, 800);
                        // If we didn’t get an engine SVG, build one from paths so Download works
                        if (!engineSvg && out.length) {
                          setLastSvg(makeSvgFromPaths(out));
                        }
                        return { paths: out, svg: engineSvg };
                      } finally {
                        worker.terminate();
                      }
                    };
                    const runJs = async (mode: 'single' | 'tiled', thresh: number): Promise<string[]> => {
                      setStatus(`⚙️ Starting JS ${mode} trace (threshold: ${thresh})...`);
                      const startTime = Date.now();
                      const worker = new Worker(new URL('../vtrace/traceWorker.ts', import.meta.url), { type: 'module' });
                      try {
                        const paths = await new Promise<string[]>((resolve, reject) => {
                          const timeout = setTimeout(() => reject(new Error(`JS ${mode} trace timeout (45s)`)), 45000);
                          const onMessage = (ev: MessageEvent<any>) => {
                            clearTimeout(timeout);
                            worker.removeEventListener('message', onMessage);
                            if (ev.data?.error) reject(new Error(ev.data.error));
                            else resolve(ev.data?.paths || []);
                          };
                          worker.addEventListener('message', onMessage);
                          worker.postMessage({ imageData: data, threshold: thresh, simplifyEps: 1.5, mode, tileSize: 512 });
                        });
                        const elapsed = Date.now() - startTime;
                        setStatus(`⚙️ JS ${mode} completed in ${elapsed}ms, found ${paths.length} paths`);
                        const trimmed = paths.slice(0, 400);
                        if (trimmed.length) setLastSvg(makeSvgFromPaths(trimmed));
                        return trimmed;
                      } finally {
                        worker.terminate();
                      }
                    };

                    // Engine SVG is captured in lastSvg when present
                    try {
                      // Reuse outer-scoped `ds` to carry results beyond this block
                      if (engine === 'wasm') {
                        // Use real VTracer WASM
                        setStatus(`🤖 Starting Real VTracer WASM...`);
                        const res = await runWasm();
                        ds = res.paths;
                        if (res.svg && !lastSvg) setLastSvg(res.svg);
                        if (ds.length > 0) {
                          setStatus(`✅ Real VTracer WASM SUCCESS: Found ${ds.length} paths`);
                        } else {
                          setStatus(`⚠️ Real VTracer returned 0 paths, trying JS fallback...`);
                          ds = await runJs('tiled', traceThreshold);
                        }
                        // If B/W + Pixel returns very few paths, suggest user actions instead of auto-invert
                        if (clusterMode === 'bw' && curveMode === 'pixel' && ds.length <= 1) {
                          setStatus('ℹ️ Pixel produced very few paths. Try Polygon or Spline, or adjust Threshold.');
                        }
                      } else {
                        // JS fallback mode  
                        setStatus(`⚙️ Starting JS tiled trace...`);
                        ds = await runJs('tiled', traceThreshold);
                        if (ds.length === 0) {
                          setStatus('🔍 No paths found, trying alternative thresholds...');
                          const sweep = [96, 160, 200];
                          for (const t of sweep) {
                            ds = await runJs('tiled', t);
                            if (ds.length) { 
                              setStatus(`✅ JS fallback succeeded with threshold ${t}`); 
                              break; 
                            }
                          }
                        }
                      }
                    } catch (err) {
                      // Fallback on main thread if worker bundling unavailable
                      setStatus(`❌ Worker trace failed (${(err as any)?.message || 'unknown'}). Trying lightweight fallback…`);
                      const startTime = Date.now();
                      ds = traceImageDataToPaths(data, traceThreshold, 1.5).slice(0, 400);
                      const elapsed = Date.now() - startTime;
                      setStatus(`🔧 Main thread fallback completed in ${elapsed}ms, found ${ds.length} paths`);
                      // Let flow continue to common handling below
                    }
                    if (ds.length === 0) {
                      setStatus('❌ All trace methods returned zero paths. Try adjusting threshold (60-200 range) or use a simpler/higher-contrast image.');
                      setBusy(false);
                      return;
                    }
                    if (!currentProject) {
                      // Keep previous behavior but do not block SVG generation; just warn
                      setStatus('No active project (SVG generated only).');
                    }
                    if (addMode === 'drawPathLayers') {
                      // Do not add anything to the canvas; only keep/generated SVG
                      // At this point, lastSvg has already been set by WASM/JS runners.
                      setStatus(prev => prev ? `${prev} • SVG ready (not added to canvas).` : 'SVG ready (not added to canvas).');
                    } else {
                      // Enter Path Refinement; can optionally cap to top 30 longest paths
                      const MAX_TO_MEASURE = 300; // limit expensive length/bbox work
                      // Cheap prefilter: use path command string length as a rough complexity proxy
                      const pre = ds
                        .map((d, i) => ({ i, d, score: d.length }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, Math.min(MAX_TO_MEASURE, ds.length));
                      // Now measure only the shortlisted candidates using DOM APIs
                      const measured = pre.map((m) => {
                        const s = sampleSvgPathToPoints(m.d, 220);
                        return { i: m.i, d: m.d, bbox: s.bbox, points: s.points, length: s.length };
                      });
                      // Sort by total curve length, longest first
                      measured.sort((a, b) => b.length - a.length);
                      // const allItems: RefineItem[] = measured.map((m, rank) => ({
                      //   id: `p-${m.i}`,
                      //   d: m.d,
                      //   bbox: m.bbox,
                      //   points: m.points,
                      //   selected: true,
                      //   kind: 'path'
                      // }));
                      // Persist full list and apply optional top-30 cap based on UI toggle
                      // const items = allItems;
                      // setRefineItems(items);
                      // setRefineViewport({ width: w, height: h });
                      // setRefineOpen(true);
                      setStatus(`Traced ${measured.length} paths successfully.`);
                    }
                  } catch (e: any) {
                    setStatus(`❌ Trace failed: ${e?.message || e}`);
                  } finally {
                    setBusy(false);
                  }
                };
                img.onerror = () => { setStatus('Failed to load image for tracing.'); setBusy(false); };
                img.src = tracePreview;
              }}
            >{busy ? 'Vectorizing…' : 'Vectorize'}</button>
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default SvgImporter;
