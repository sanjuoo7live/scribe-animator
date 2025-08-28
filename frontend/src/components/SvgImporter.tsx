import React from 'react';
import { useAppStore } from '../store/appStore';
import { traceImageDataToPaths } from '../vtrace/simpleTrace';
import { segmentImageDataWithMediaPipe } from '../segmentation/mediapipe';

type ParsedPath = { d: string; stroke?: string; strokeWidth?: number; fill?: string; fillRule?: 'nonzero'|'evenodd' };

// Lightweight item used in Path Refinement UI
type RefineItem = {
  id: string;
  d: string;
  bbox: { x: number; y: number; width: number; height: number };
  points: { x: number; y: number }[];
  selected: boolean;
  kind?: 'path' | 'connector';
};

const SvgImporter: React.FC = () => {
  const addObject = useAppStore(s => s.addObject);
  const currentProject = useAppStore(s => s.currentProject);

  const [rawInput, setRawInput] = React.useState('');
  const [status, setStatus] = React.useState<string>('');
  const [traceThreshold, setTraceThreshold] = React.useState<number>(128);
  const [tracePreview, setTracePreview] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [maxDim, setMaxDim] = React.useState<number>(768);
  const [engine, setEngine] = React.useState<'basic' | 'tiled' | 'wasm'>('wasm'); // Default to WASM
  const [addMode, setAddMode] = React.useState<'drawPathLayers' | 'svgCombined'>('drawPathLayers');
  // Layer selection heuristic (now default off; prefer foreground isolation below)
  const [keepOnlyBiggest, setKeepOnlyBiggest] = React.useState<boolean>(false);
  
  // Foreground isolation helpers
  // ROI is stored normalized to the displayed image content (0..1)
  const [roi, setRoi] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const [pickKeyColor, setPickKeyColor] = React.useState<boolean>(false);
  const [removeBgWhite, setRemoveBgWhite] = React.useState<boolean>(false);
  const [whiteLevel, setWhiteLevel] = React.useState<number>(235); // 200..255
  const [useKeyColor, setUseKeyColor] = React.useState<boolean>(false);
  const [keyColor, setKeyColor] = React.useState<{ r: number; g: number; b: number } | null>(null);
  const [keyTolerance, setKeyTolerance] = React.useState<number>(36); // 0..128
  // MediaPipe integration toggles
  const [useSegmentation, setUseSegmentation] = React.useState<boolean>(false);
  const [segFeather, setSegFeather] = React.useState<number>(2);
  const [segModel, setSegModel] = React.useState<0|1>(1);
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
  // Runtime indicators
  const [lastEngine, setLastEngine] = React.useState<null | 'official' | 'npm' | 'local' | 'minimal'>(null);
  // Path Refinement modal state
  const [refineOpen, setRefineOpen] = React.useState(false);
  const [refineItems, setRefineItems] = React.useState<RefineItem[] | null>(null);
  // Keep full, length-sorted list to allow toggling limits in the refiner
  const [refineAllItems, setRefineAllItems] = React.useState<RefineItem[] | null>(null);
  // Optional cap: limit refiner list to top 30 longest paths (off by default)
  const [limitRefinerTop30, setLimitRefinerTop30] = React.useState<boolean>(false);
  const [refineViewport, setRefineViewport] = React.useState<{ width: number; height: number } | null>(null);
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

  const parseMaybePathOnly = (text: string): ParsedPath[] => {
    // If user pasted only the path "d" data, wrap and parse
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('<')) {
      const parsed = parseSvgString(trimmed);
      return parsed.paths;
    }
    // Assume it's a d attribute
    return [{ d: trimmed, stroke: '#111827', strokeWidth: 3, fill: 'transparent' }];
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

  const addPathsToCanvas = (paths: ParsedPath[]) => {
    if (!currentProject) {
      setStatus('No active project.');
      return;
    }
    if (!paths.length) {
      setStatus('No paths found.');
      return;
    }
    const bbox = measureSvgPathsBBox(paths);
    addObject({
      id: `svg-${Date.now()}`,
      type: 'svgPath',
      x: 100 - bbox.x, // rebase to start near (100,100)
      y: 100 - bbox.y,
      width: bbox.width,
      height: bbox.height,
      rotation: 0,
      properties: {
        paths: paths.map(p => ({ d: p.d, stroke: p.stroke || '#111827', strokeWidth: p.strokeWidth ?? 3, fill: p.fill || 'transparent' }))
      },
      animationType: 'drawIn',
      animationStart: 0,
      animationDuration: 2,
      animationEasing: 'easeOut'
    });
    setStatus(`Imported ${paths.length} path${paths.length > 1 ? 's' : ''} ✔`);
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const { paths, viewBox } = parseSvgString(text);
      if (viewBox) {
        // Normalize by viewBox: rebase already handled; set object to viewBox size for consistent scale.
        const bbox = { x: 0, y: 0, width: viewBox.width, height: viewBox.height };
        if (!currentProject) return;
        addObject({
          id: `svg-${Date.now()}`,
          type: 'svgPath',
          x: 100,
          y: 100,
          width: bbox.width,
          height: bbox.height,
          rotation: 0,
          properties: {
            paths: paths.map(p => ({ d: p.d, stroke: p.stroke || '#111827', strokeWidth: p.strokeWidth ?? 3, fill: p.fill || 'transparent', fillRule: p.fillRule }))
          },
          animationType: 'drawIn',
          animationStart: 0,
          animationDuration: 2,
          animationEasing: 'easeOut'
        });
        setStatus(`Imported ${paths.length} element${paths.length > 1 ? 's' : ''} ✔ (viewBox normalized)`);
      } else {
        addPathsToCanvas(paths);
      }
    } catch (e: any) {
      setStatus(`Failed to read file: ${e?.message || e}`);
    }
  };

  const handlePaste = () => {
    if (rawInput.trim().startsWith('<')) {
      const { paths, viewBox } = parseSvgString(rawInput);
      if (viewBox) {
        if (!currentProject) { setStatus('No active project.'); return; }
        addObject({
          id: `svg-${Date.now()}`,
          type: 'svgPath',
          x: 100,
          y: 100,
          width: viewBox.width,
          height: viewBox.height,
          rotation: 0,
          properties: {
            paths: paths.map(p => ({ d: p.d, stroke: p.stroke || '#111827', strokeWidth: p.strokeWidth ?? 3, fill: p.fill || 'transparent', fillRule: p.fillRule }))
          },
          animationType: 'drawIn',
          animationStart: 0,
          animationDuration: 2,
          animationEasing: 'easeOut'
        });
        setStatus(`Imported ${paths.length} element${paths.length > 1 ? 's' : ''} ✔ (viewBox normalized)`);
        return;
      }
      addPathsToCanvas(paths);
    } else {
      const paths = parseMaybePathOnly(rawInput);
      addPathsToCanvas(paths);
    }
  };

  return (
  <>
  <div className="p-3 text-white">
      <div className="mb-3 text-sm text-gray-300">Import SVG vectors as editable, animatable paths.</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 bg-gray-800 rounded border border-gray-700">
          <div className="text-sm font-semibold mb-2">Upload .svg file</div>
          <input
            type="file"
            accept=".svg,image/svg+xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block w-full text-sm text-gray-200 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500"
          />
          <div className="text-xs text-gray-400 mt-2">We parse &lt;path&gt; elements and combine them into one object.</div>
        </div>

        <div className="p-3 bg-gray-800 rounded border border-gray-700">
          <div className="text-sm font-semibold mb-2">Paste SVG or path d</div>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Paste full <svg>...</svg> or just a path d string (e.g., M10 10 L 50 50 ...)."
            className="w-full h-28 p-2 bg-gray-900 border border-gray-700 rounded text-sm"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handlePaste}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium"
            >Add to Canvas</button>
          </div>
        </div>
      </div>

      {status && <div className="mt-3 text-xs text-gray-300">{status}</div>}

      <div className="mt-4 p-3 bg-gray-800/70 rounded border border-gray-700">
              <div className="text-sm font-semibold mb-2 flex items-center gap-3">
                <span>Auto-trace (WASM with VTracer options)</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
          <div className="md:col-span-1">
            <div className="text-xs text-gray-300 mb-1">Upload raster (PNG/JPG)</div>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                // Revoke any previous preview URL to avoid leaks
                setTracePreview(prev => { if (prev) URL.revokeObjectURL(prev); return prev; });
                const url = URL.createObjectURL(f);
                setTracePreview(url);
              }}
              className="block w-full text-sm text-gray-200 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500"
            />
            <div className="mt-3 text-xs text-gray-400">Threshold: {traceThreshold}</div>
            <input
              type="range"
              min={0}
              max={255}
              value={traceThreshold}
              onChange={(e) => setTraceThreshold(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-3 text-xs text-gray-300">Max size</div>
            <select
              value={maxDim}
              onChange={(e) => setMaxDim(Number(e.target.value))}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs"
            >
              <option value={512}>512 px</option>
              <option value={768}>768 px</option>
              <option value={1024}>1024 px</option>
            </select>
            <div className="mt-3 text-xs text-gray-300">Preset</div>
            <select
              value={preset}
              onChange={(e)=>applyPreset(e.target.value as any)}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs w-full"
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
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs"
            >
              <option value="wasm">WASM (Best Quality)</option>
              <option value="tiled">JS Fallback</option>
            </select>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-300 mb-1">Clustering</div>
                <div className="flex gap-1">
                  <button type="button" className={`px-2 py-1 rounded text-xs ${clusterMode==='bw'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>{ setClusterMode('bw'); setPreset('custom'); }}>B/W</button>
                  <button type="button" className={`px-2 py-1 rounded text-xs ${clusterMode==='color'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>{ setClusterMode('color'); setPreset('custom'); }}>COLOR</button>
                </div>
              </div>
              {clusterMode === 'color' && (
                <div>
                  <div className="text-xs text-gray-300 mb-1">Layers</div>
                  <div className="flex gap-1">
                    <button type="button" className={`px-2 py-1 rounded text-xs ${hierarchyMode==='cutout'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>{ setHierarchyMode('cutout'); setPreset('custom'); }}>CUTOUT</button>
                    <button type="button" className={`px-2 py-1 rounded text-xs ${hierarchyMode==='stacked'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>{ setHierarchyMode('stacked'); setPreset('custom'); }}>STACKED</button>
                  </div>
                </div>
              )}
              <div className="col-span-2 mt-2">
                <div className="text-xs text-gray-300 mb-1">Filter Speckle <span className="text-[10px] text-gray-400">(Cleaner)</span></div>
                <input type="range" min={0} max={20} value={filterSpeckle} onChange={(e)=>{ setFilterSpeckle(Number(e.target.value)); setPreset('custom'); }} className="w-full" />
              </div>
              {clusterMode === 'color' && (
                <>
                  <div>
                    <div className="text-xs text-gray-300 mb-1">Color Precision <span className="text-[10px] text-gray-400">(More accurate)</span></div>
                    <input type="range" min={1} max={8} value={colorPrecision} onChange={(e)=>{ setColorPrecision(Number(e.target.value)); setPreset('custom'); }} className="w-full" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-300 mb-1">Gradient Step <span className="text-[10px] text-gray-400">(Less layers)</span></div>
                    <input type="range" min={1} max={64} value={gradientStep} onChange={(e)=>{ setGradientStep(Number(e.target.value)); setPreset('custom'); }} className="w-full" />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <div className="text-xs text-gray-300 mb-1">Curve Fitting</div>
                <div className="flex gap-1">
                  <button type="button" className={`px-2 py-1 rounded text-xs ${curveMode==='pixel'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>{ setCurveMode('pixel'); setPreset('custom'); }}>PIXEL</button>
                  <button type="button" className={`px-2 py-1 rounded text-xs ${curveMode==='polygon'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>{ setCurveMode('polygon'); setPreset('custom'); }}>POLYGON</button>
                  <button type="button" className={`px-2 py-1 rounded text-xs ${curveMode==='spline'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>{ setCurveMode('spline'); setPreset('custom'); }}>SPLINE</button>
                </div>
              </div>
              {curveMode === 'spline' && (
                <>
                  <div>
                    <div className="text-xs text-gray-300 mb-1">Corner Threshold <span className="text-[10px] text-gray-400">(Smoother)</span></div>
                    <input type="range" min={0} max={120} value={cornerThreshold} onChange={(e)=>{ setCornerThreshold(Number(e.target.value)); setPreset('custom'); }} className="w-full" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-300 mb-1">Segment Length <span className="text-[10px] text-gray-400">(More coarse)</span></div>
                    <input type="range" min={1} max={12} step={0.5} value={segmentLength} onChange={(e)=>{ setSegmentLength(Number(e.target.value)); setPreset('custom'); }} className="w-full" />
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-300 mb-1">Splice Threshold <span className="text-[10px] text-gray-400">(Less accurate)</span></div>
                    <input type="range" min={0} max={90} value={spliceThreshold} onChange={(e)=>{ setSpliceThreshold(Number(e.target.value)); setPreset('custom'); }} className="w-full" />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="md:col-span-1">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-300 mb-1">Preview</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-xs ${lastSvg? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-800 opacity-50 cursor-not-allowed'}`}
                  disabled={!lastSvg}
                  onClick={downloadLastSvg}
                  title="Download last traced SVG"
                >Download SVG</button>
              </div>
            </div>
            {tracePreview ? (
              <div className="relative w-full max-h-48">
                {/* Image */}
                <img
                  ref={imgRef}
                  src={tracePreview}
                  alt="preview"
                  className="w-full max-h-48 object-contain rounded border border-gray-700 bg-gray-900 select-none"
                  onLoad={() => {
                    // Clear ROI when image changes
                    setRoi(null);
                  }}
                  onMouseDown={(e) => {
                    if (!imgRef.current) return;
                    // Support either ROI drag or color pick
                    if (pickKeyColor) return; // handled in onClick
                    const rect = imgRef.current.getBoundingClientRect();
                    const iw = imgRef.current.naturalWidth;
                    const ih = imgRef.current.naturalHeight;
                    const rectAspect = rect.width / rect.height;
                    const imgAspect = iw / ih;
                    let cx = rect.x, cy = rect.y, cw = rect.width, ch = rect.height;
                    if (imgAspect > rectAspect) {
                      // letterbox vertical
                      ch = rect.width / imgAspect;
                      cy = rect.y + (rect.height - ch) / 2;
                    } else {
                      // letterbox horizontal
                      cw = rect.height * imgAspect;
                      cx = rect.x + (rect.width - cw) / 2;
                    }
                    const px = (e.clientX - cx) / cw;
                    const py = (e.clientY - cy) / ch;
                    if (px < 0 || py < 0 || px > 1 || py > 1) return;
                    setDragStart({ x: Math.max(0, Math.min(1, px)), y: Math.max(0, Math.min(1, py)) });
                    setRoi({ x: Math.max(0, Math.min(1, px)), y: Math.max(0, Math.min(1, py)), w: 0, h: 0 });
                  }}
                  onMouseMove={(e) => {
                    if (!imgRef.current || !dragStart) return;
                    const rect = imgRef.current.getBoundingClientRect();
                    const iw = imgRef.current.naturalWidth;
                    const ih = imgRef.current.naturalHeight;
                    const rectAspect = rect.width / rect.height;
                    const imgAspect = iw / ih;
                    let cx = rect.x, cy = rect.y, cw = rect.width, ch = rect.height;
                    if (imgAspect > rectAspect) {
                      ch = rect.width / imgAspect;
                      cy = rect.y + (rect.height - ch) / 2;
                    } else {
                      cw = rect.height * imgAspect;
                      cx = rect.x + (rect.width - cw) / 2;
                    }
                    const px = (e.clientX - cx) / cw;
                    const py = (e.clientY - cy) / ch;
                    const ex = Math.max(0, Math.min(1, px));
                    const ey = Math.max(0, Math.min(1, py));
                    const x = Math.min(dragStart.x, ex);
                    const y = Math.min(dragStart.y, ey);
                    const w = Math.abs(ex - dragStart.x);
                    const h = Math.abs(ey - dragStart.y);
                    setRoi({ x, y, w, h });
                  }}
                  onMouseUp={() => setDragStart(null)}
                  onMouseLeave={() => setDragStart(null)}
                  onClick={async (e) => {
                    if (!pickKeyColor || !imgRef.current) return;
                    const rect = imgRef.current.getBoundingClientRect();
                    const iw = imgRef.current.naturalWidth;
                    const ih = imgRef.current.naturalHeight;
                    const rectAspect = rect.width / rect.height;
                    const imgAspect = iw / ih;
                    let cx = rect.x, cy = rect.y, cw = rect.width, ch = rect.height;
                    if (imgAspect > rectAspect) {
                      ch = rect.width / imgAspect;
                      cy = rect.y + (rect.height - ch) / 2;
                    } else {
                      cw = rect.height * imgAspect;
                      cx = rect.x + (rect.width - cw) / 2;
                    }
                    const px = (e.clientX - cx) / cw;
                    const py = (e.clientY - cy) / ch;
                    if (px < 0 || py < 0 || px > 1 || py > 1) return;
                    // Sample color at natural resolution
                    const tmp = document.createElement('canvas');
                    tmp.width = iw; tmp.height = ih;
                    const tctx = tmp.getContext('2d');
                    if (!tctx) return;
                    const im = new Image();
                    im.src = imgRef.current.src;
                    await im.decode().catch(()=>{});
                    tctx.drawImage(im, 0, 0, iw, ih);
                    const sx = Math.max(0, Math.min(iw - 1, Math.round(px * iw)));
                    const sy = Math.max(0, Math.min(ih - 1, Math.round(py * ih)));
                    const p = tctx.getImageData(sx, sy, 1, 1).data;
                    setKeyColor({ r: p[0], g: p[1], b: p[2] });
                    setUseKeyColor(true);
                    setPickKeyColor(false);
                  }}
                />
                {/* ROI rectangle overlay */}
                {roi && roi.w > 0 && roi.h > 0 && (
                  <div
                    className="pointer-events-none absolute border-2 border-amber-400"
                    style={(() => {
                      if (!imgRef.current) return { display: 'none' } as React.CSSProperties;
                      const rect = imgRef.current.getBoundingClientRect();
                      const iw = imgRef.current.naturalWidth;
                      const ih = imgRef.current.naturalHeight;
                      const rectAspect = rect.width / rect.height;
                      const imgAspect = iw / ih;
                      let cx = 0, cy = 0, cw = rect.width, ch = rect.height;
                      if (imgAspect > rectAspect) {
                        ch = rect.width / imgAspect;
                        cy = (rect.height - ch) / 2;
                      } else {
                        cw = rect.height * imgAspect;
                        cx = (rect.width - cw) / 2;
                      }
                      return {
                        position: 'absolute',
                        left: `${cx + roi.x * cw}px`,
                        top: `${cy + roi.y * ch}px`,
                        width: `${roi.w * cw}px`,
                        height: `${roi.h * ch}px`,
                        boxSizing: 'border-box'
                      } as React.CSSProperties;
                    })()}
                  />
                )}
              </div>
            ) : (
              <div className="w-full h-32 flex items-center justify-center text-xs text-gray-500 border border-dashed border-gray-700 rounded">No image selected</div>
            )}
                    <div className="mt-3 text-xs text-gray-300">Preset</div>
                    <select
                      value={preset}
                      onChange={(e)=>applyPreset(e.target.value as Preset)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs w-full"
                    >
                      <option value="photo-subject">Photo (Subject)</option>
                      <option value="line-art">Sketch / Line Art</option>
                      <option value="logo-flat">Logo / Flat</option>
                      <option value="noisy-photo">Noisy Photo</option>
                      <option value="custom">Custom</option>
                    </select>
          </div>
          <div className="md:col-span-1 flex flex-col gap-2 items-end">
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
                  // Apply ROI crop if provided
                  let cropW = w, cropH = h, sx = 0, sy = 0;
                  if (roi && roi.w > 0.02 && roi.h > 0.02) {
                    sx = Math.max(0, Math.floor(roi.x * w));
                    sy = Math.max(0, Math.floor(roi.y * h));
                    cropW = Math.max(1, Math.floor(roi.w * w));
                    cropH = Math.max(1, Math.floor(roi.h * h));
                    const c2 = document.createElement('canvas');
                    c2.width = cropW; c2.height = cropH;
                    const c2x = c2.getContext('2d');
                    if (c2x) c2x.drawImage(canvas, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
                    // Replace canvas/data with cropped content
                    canvas.width = cropW; canvas.height = cropH;
                    const ctx2 = canvas.getContext('2d');
                    if (ctx2 && c2x) ctx2.drawImage(c2, 0, 0);
                  }
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

                  // Auto subject segmentation (MediaPipe) before other preprocessing
          if (useSegmentation) {
                    setStatus('✂️ Segmenting subject (MediaPipe)...');
                    try {
                      data = await segmentImageDataWithMediaPipe(data, { modelSelection: segModel, featherPx: segFeather });
                      setStatus('✂️ Segmentation complete');
                    } catch (e:any) {
                      setStatus(`⚠️ Segmentation failed: ${e?.message || e}`);
                    }
                  }
                  // Optional background removal
                  if (removeBgWhite || (useKeyColor && keyColor)) {
                    const d = data.data;
                    const tol2 = keyTolerance * keyTolerance;
                    for (let i = 0; i < d.length; i += 4) {
                      const r = d[i], g = d[i + 1], b = d[i + 2];
                      let makeTransparent = false;
                      if (removeBgWhite) {
                        if (r >= whiteLevel && g >= whiteLevel && b >= whiteLevel) makeTransparent = true;
                      }
                      if (!makeTransparent && useKeyColor && keyColor) {
                        const dr = r - keyColor.r;
                        const dg = g - keyColor.g;
                        const db = b - keyColor.b;
                        if (dr * dr + dg * dg + db * db <= tol2) makeTransparent = true;
                      }
                      if (makeTransparent) {
                        d[i + 3] = 0; // zero alpha
                      }
                    }
                    // Put back modified data
                    const ctxm = canvas.getContext('2d');
                    if (ctxm) ctxm.putImageData(data, 0, 0);
                    // Re-read to ensure consistent buffer
                    data = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  }
                  
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
                    if (!currentProject) { setStatus('No active project.'); setBusy(false); return; }
                    if (addMode === 'drawPathLayers') {
                      const MAX_LAYERS = 50;          // practical cap for timeline
                      const MIN_AREA = 300;           // px^2 - ignore tiny specks
                      const MIN_POINTS = 12;          // ignore ultra-short segments
                      const MIN_LENGTH = 100;         // px - minimum curve length
                      const IOU_SKIP = 0.85;          // skip boxes overlapping too much with already kept ones

                      type Cand = { d: string; points: {x:number;y:number}[]; bbox: {x:number;y:number;width:number;height:number}; length: number; area: number };
                      const candidates: Cand[] = [];
                      for (const d of ds) {
                        const s = sampleSvgPathToPoints(d, 220);
                        if (!s.points.length) continue;
                        const area = s.bbox.width * s.bbox.height;
                        if (area < MIN_AREA || s.points.length < MIN_POINTS || s.length < MIN_LENGTH) continue;
                        candidates.push({ d, points: s.points, bbox: s.bbox, length: s.length, area });
                      }

                      // If strict filters removed everything, try a relaxed pass
                      if (candidates.length === 0) {
                        const MIN_AREA_RELAX = 50;
                        const MIN_POINTS_RELAX = 6;
                        const MIN_LENGTH_RELAX = 20;
                        for (const d of ds.slice(0, 60)) {
                          const s = sampleSvgPathToPoints(d, 160);
                          if (!s.points.length) continue;
                          const area = s.bbox.width * s.bbox.height;
                          if (area < MIN_AREA_RELAX || s.points.length < MIN_POINTS_RELAX || s.length < MIN_LENGTH_RELAX) continue;
                          candidates.push({ d, points: s.points, bbox: s.bbox, length: s.length, area });
                        }
                      }
                      // If still nothing, fallback to combined SVG path object to ensure something is added
                      if (candidates.length === 0) {
                        const combined = ds.join(' ');
                        useAppStore.getState().addObject({
                          id: `svg-${Date.now()}`,
                          type: 'svgPath',
                          x: 100,
                          y: 100,
                          width: Math.max(64, w),
                          height: Math.max(64, h),
                          rotation: 0,
                          properties: { paths: [{ d: combined, stroke: '#111827', strokeWidth: 2, fill: 'transparent' }] },
                          animationType: 'drawIn',
                          animationStart: 0,
                          animationDuration: 2,
                          animationEasing: 'easeOut'
                        });
                        setStatus('⚠️ Strict filters removed all layers; added combined SVG instead.');
                        setBusy(false);
                        return;
                      }

                      // Sort by area (largest first)
                      candidates.sort((a, b) => b.area - a.area || b.length - a.length);

                      // Selection strategy: either keep only the biggest or keep several non-overlapping
                      let kept: Cand[] = [];
                      if (keepOnlyBiggest) {
                        kept = [candidates[0]];
                      } else {
                        // Otherwise, greedily keep non-overlapping boxes up to MAX_LAYERS
                        const iou = (a: Cand, b: Cand) => {
                          const x1 = Math.max(a.bbox.x, b.bbox.x);
                          const y1 = Math.max(a.bbox.y, b.bbox.y);
                          const x2 = Math.min(a.bbox.x + a.bbox.width, b.bbox.x + b.bbox.width);
                          const y2 = Math.min(a.bbox.y + a.bbox.height, b.bbox.y + b.bbox.height);
                          const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
                          const union = a.area + b.area - inter;
                          return union > 0 ? inter / union : 0;
                        };
                        for (const c of candidates) {
                          if (kept.length >= MAX_LAYERS) break;
                          if (kept.some(k => iou(k, c) >= IOU_SKIP)) continue;
                          kept.push(c);
                        }
                      }

                      let added = 0;
                      for (const k of kept) {
                        useAppStore.getState().addObject({
                          id: `drawpath-${Date.now()}-${added}`,
                          type: 'drawPath',
                          x: 100 + (added % 5) * 2,
                          y: 100 + (added % 5) * 2,
                          width: k.bbox.width,
                          height: k.bbox.height,
                          rotation: 0,
                          properties: {
                            pathName: `Trace ${added+1}`,
                            points: k.points,
                            strokeColor: '#111827',
                            strokeWidth: 2,
                            selectedPenType: 'pen',
                            handRotation: true
                          },
                          animationType: 'drawIn',
                          animationStart: 0,
                          animationDuration: 2,
                          animationEasing: 'easeOut'
                        });
                        added++;
                      }
                      setStatus(`Added ${added} draw-path layer${added !== 1 ? 's' : ''} ✔`);
                    } else {
                      // Enter Path Refinement; can optionally cap to top 30 longest paths
                      const MAX_REFINER_ITEMS = 30;
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
                      const allItems: RefineItem[] = measured.map((m, rank) => ({
                        id: `p-${m.i}`,
                        d: m.d,
                        bbox: m.bbox,
                        points: m.points,
                        selected: true,
                        kind: 'path'
                      }));
                      // Persist full list and apply optional top-30 cap based on UI toggle
                      setRefineAllItems(allItems);
                      const items = limitRefinerTop30 ? allItems.slice(0, Math.min(MAX_REFINER_ITEMS, allItems.length)) : allItems;
                      setRefineItems(items);
                      setRefineViewport({ width: w, height: h });
                      setRefineOpen(true);
                      setStatus(`Refine ${items.length} paths${limitRefinerTop30 ? ` (top ${MAX_REFINER_ITEMS})` : ''}: click to toggle, delete noise, connect gaps, then Generate Single Path.`);
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
            >{busy ? 'Tracing…' : 'Trace to Vector'}</button>

            {/* Foreground isolation controls */}
            <div className="w-full mt-2 p-2 rounded bg-gray-900/60 border border-gray-700">
              <div className="text-[11px] text-gray-200 font-medium mb-1">Foreground isolation</div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-300">
                <label className="inline-flex items-center gap-1">
                  
                  <input type="checkbox" checked={useSegmentation} onChange={(e)=>setUseSegmentation(e.target.checked)} />
                  <span>Auto-segment (MediaPipe)</span>
                </label>
                {useSegmentation && (
                  <>
                    <span className="text-gray-400">feather {segFeather}px</span>
                    <input type="range" min={0} max={12} value={segFeather} onChange={(e)=>setSegFeather(Number(e.target.value))} />
                    <span className="text-gray-400">model</span>
                    <select className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5"
                      value={segModel}
                      onChange={(e)=>setSegModel(Number(e.target.value) as 0|1)}
                    >
                      <option value={0}>General</option>
                      <option value={1}>Landscape</option>
                    </select>
                  </>
                )}
                <button
                  type="button"
                  className={`px-2 py-1 rounded ${roi ? 'bg-amber-600' : 'bg-gray-700'}`}
                  title="Drag a rectangle on the preview to crop before tracing"
                  onClick={() => setRoi(null)}
                >{roi ? 'Clear crop' : 'Crop: drag on preview'}</button>
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={removeBgWhite} onChange={(e)=>setRemoveBgWhite(e.target.checked)} />
                  <span>Remove near-white</span>
                </label>
                {removeBgWhite && (
                  <>
                    <span className="text-gray-400">thr {whiteLevel}</span>
                    <input type="range" min={200} max={255} value={whiteLevel} onChange={(e)=>setWhiteLevel(Number(e.target.value))} />
                  </>
                )}
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={useKeyColor} onChange={(e)=>setUseKeyColor(e.target.checked)} />
                  <span>Key color</span>
                </label>
                <button type="button" className={`px-2 py-1 rounded ${pickKeyColor?'bg-blue-600':'bg-gray-700'}`} onClick={() => setPickKeyColor(v=>!v)}>Pick from image</button>
                {keyColor && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm border border-gray-600 inline-block" style={{ backgroundColor: `rgb(${keyColor.r},${keyColor.g},${keyColor.b})` }} />
                    <span className="text-gray-400">±{keyTolerance}</span>
                  </span>
                )}
                <input type="range" min={0} max={128} value={keyTolerance} onChange={(e)=>setKeyTolerance(Number(e.target.value))} />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-300">
              <span>Add as:</span>
              <button type="button" className={`px-2 py-1 rounded ${addMode==='drawPathLayers'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setAddMode('drawPathLayers')}>Draw Path layers</button>
              <button type="button" className={`px-2 py-1 rounded ${addMode==='svgCombined'?'bg-blue-600':'bg-gray-700'}`} onClick={()=>setAddMode('svgCombined')}>Combined SVG</button>
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-300">
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={keepOnlyBiggest} onChange={(e)=>setKeepOnlyBiggest(e.target.checked)} />
                <span>Keep only biggest shape</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={limitRefinerTop30}
                  onChange={(e)=>{
                    const on = e.target.checked;
                    setLimitRefinerTop30(on);
                    // If refiner is open, apply cap/uncap live
                    if (refineOpen && refineAllItems) {
                      const cap = 30;
                      setRefineItems(on ? refineAllItems.slice(0, Math.min(cap, refineAllItems.length)) : refineAllItems);
                    }
                  }}
                />
                <span>Limit Path Refinement to top 30</span>
              </label>
            </div>

            <div className="text-[11px] text-gray-400">WASM provides highest quality vector tracing. JS Fallback is used automatically if needed.</div>
            <div className="text-[11px] text-gray-400">Path Refinement limit: {limitRefinerTop30 ? 'Top 30 paths' : 'No limit'}.</div>
          </div>
        </div>
      </div>
    </div>
  {refineOpen && !!refineItems && !!refineViewport && (
      <PathRefiner
        open={true}
        onClose={() => setRefineOpen(false)}
        viewport={refineViewport!}
        items={refineItems!}
        setItems={(updater) => setRefineItems(prev => prev ? updater(prev) : prev)}
        limitRefinerTop30={limitRefinerTop30}
        onToggleLimit={(on: boolean) => {
          setLimitRefinerTop30(on);
          if (refineAllItems) {
            const cap = 30;
            setRefineItems(on ? refineAllItems.slice(0, Math.min(cap, refineAllItems.length)) : refineAllItems);
          }
        }}
        fullItems={refineAllItems}
        onApplySingle={(combinedD) => {
          // Add a single svgPath with one combined path
          useAppStore.getState().addObject({
            id: `svg-${Date.now()}`,
            type: 'svgPath',
            x: 100,
            y: 100,
      width: refineViewport!.width,
      height: refineViewport!.height,
            rotation: 0,
            properties: {
              paths: [{ d: combinedD, stroke: '#111827', strokeWidth: 2, fill: 'transparent' }]
            },
            animationType: 'drawIn',
            animationStart: 0,
            animationDuration: 2,
            animationEasing: 'easeOut'
          });
          setStatus('Added single combined path ✔');
          setRefineOpen(false);
          setRefineItems(null);
        }}
      />
    )}
    </>
  );
};

export default SvgImporter;

// Mount the PathRefiner overlay inside SvgImporter render tree
// Inject right before export by augmenting SvgImporter return is not feasible here;
// Instead, we rely on placing the component above and rendering it conditionally where SvgImporter returns.

// Inline Path Refinement modal component (scoped to SvgImporter helpers)
const PathRefiner: React.FC<{
  open: boolean;
  onClose: () => void;
  viewport: { width: number; height: number };
  items: RefineItem[];
  setItems: (updater: (prev: RefineItem[]) => RefineItem[]) => void;
  limitRefinerTop30: boolean;
  onToggleLimit: (on: boolean) => void;
  fullItems: RefineItem[] | null;
  onApplySingle: (combinedD: string) => void;
}> = ({ open, onClose, viewport, items, setItems, limitRefinerTop30, onToggleLimit, fullItems, onApplySingle }) => {
  const [hoverId, setHoverId] = React.useState<string | null>(null);

  // Compute combined bbox to center/fit content so it doesn't hide off-screen
  const vb = React.useMemo(() => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.position = 'absolute'; svg.style.left = '-99999px'; svg.style.top = '-99999px';
    document.body.appendChild(svg);
    let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
    try {
      for (const it of items) {
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', it.d);
        svg.appendChild(path);
        const b = path.getBBox();
        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
      }
    } catch {}
    document.body.removeChild(svg);
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return { x: 0, y: 0, w: viewport.width, h: viewport.height };
    }
    const pad = Math.max(1, Math.round(Math.max(maxX - minX, maxY - minY) * 0.05));
    return { x: Math.floor(minX) - pad, y: Math.floor(minY) - pad, w: Math.ceil(maxX - minX) + 2 * pad, h: Math.ceil(maxY - minY) + 2 * pad };
  }, [items, viewport.width, viewport.height]);

  const toggle = (id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, selected: !it.selected } : it));
  };

  const deleteSelected = () => {
    setItems(prev => prev.filter(it => !it.selected));
  };

  const selectAll = (val: boolean) => {
    setItems(prev => prev.map(it => ({ ...it, selected: val })));
  };

  const connectTwo = () => {
    const sel = items.filter(it => it.selected);
    if (sel.length !== 2) return;
    const [a, b] = sel;
    if (a.points.length === 0 || b.points.length === 0) return;
    const aEnds = [a.points[0], a.points[a.points.length - 1]];
    const bEnds = [b.points[0], b.points[b.points.length - 1]];
    let best: { ai: number; bi: number; d: number } | null = null;
    for (let ai = 0; ai < 2; ai++) for (let bi = 0; bi < 2; bi++) {
      const dx = aEnds[ai].x - bEnds[bi].x;
      const dy = aEnds[ai].y - bEnds[bi].y;
      const dist = Math.hypot(dx, dy);
      if (!best || dist < best.d) best = { ai, bi, d: dist };
    }
    if (!best) return;
  // Capture narrowed values into locals to satisfy TS across the closure
  const bai = best.ai;
  const bbi = best.bi;
  const d = `M ${aEnds[bai].x} ${aEnds[bai].y} L ${bEnds[bbi].x} ${bEnds[bbi].y}`;
  const id = `connector-${Date.now()}`;
  const p1 = aEnds[bai];
  const p2 = bEnds[bbi];
  setItems(prev => prev.concat([{ id, d, bbox: { x: 0, y: 0, width: 0, height: 0 }, points: [p1, p2], selected: true, kind: 'connector' }]));
  };

  const applySingle = () => {
    const ds = items.filter(it => it.selected).map(it => it.d);
    if (ds.length === 0) return;
    const combined = ds.join(' ');
    onApplySingle(combined);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 w-[90vw] h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-200 font-medium">Path Refinement</div>
          <button className="px-2 py-1 rounded bg-gray-700 text-gray-200" onClick={onClose}>Close</button>
        </div>
        <div className="flex-1 grid grid-cols-[1fr_280px] gap-3 overflow-hidden">
          <div className="relative overflow-auto bg-white">
            <svg
              width={viewport.width}
              height={viewport.height}
              viewBox={`${vb.x} ${vb.y} ${Math.max(1, vb.w)} ${Math.max(1, vb.h)}`}
              className="block"
            >
              {items.map(it => (
                <path
                  key={it.id}
                  d={it.d}
                  fill="none"
                  stroke={it.selected ? (hoverId===it.id? '#22d3ee' : '#2563eb') : '#9ca3af'}
                  strokeWidth={it.selected ? (hoverId===it.id? 3 : 2) : 1}
                  opacity={it.kind==='connector' ? 0.9 : (it.selected ? 0.95 : 0.4)}
                  style={{ cursor: 'pointer', pointerEvents: 'stroke' as any }}
                  onMouseEnter={() => setHoverId(it.id)}
                  onMouseLeave={() => setHoverId(prev => prev===it.id? null : prev)}
                  onClick={() => toggle(it.id)}
                />
              ))}
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-300">Paths: {items.length} | Selected: {items.filter(i=>i.selected).length}</div>
              <label className="inline-flex items-center gap-1 text-[11px] text-gray-300">
                <input
                  type="checkbox"
                  checked={!!limitRefinerTop30}
                  onChange={(e) => onToggleLimit(e.target.checked)}
                  title="Limit displayed items to top 30 longest paths"
                />
                <span>Limit to 30</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded bg-gray-700 text-gray-200" onClick={() => selectAll(true)}>Select all</button>
              <button className="px-2 py-1 rounded bg-gray-700 text-gray-200" onClick={() => selectAll(false)}>Select none</button>
            </div>
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded bg-rose-700 text-white" onClick={deleteSelected}>Delete selected</button>
              <button className="px-2 py-1 rounded bg-emerald-700 text-white" onClick={connectTwo} title="Select exactly two paths to bridge them">Connect 2</button>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700" />
            <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={applySingle}>Generate Single Path and Add</button>
            <div className="text-[11px] text-gray-400">
              Tips: Click paths to toggle selection. Connect 2 joins nearest endpoints with a line. The final single path concatenates selected paths and connectors.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
