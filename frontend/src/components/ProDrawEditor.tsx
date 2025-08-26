import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Stage, Layer, Group, Image as KonvaImage, Line, Circle, Text } from 'react-konva';
import { useAppStore } from '../store/appStore';

type Point = { x: number; y: number };

type NodeType = 'corner' | 'smooth';

interface PathNode {
  id: string;
  p: Point; // position
  type: NodeType;
}

interface PathData {
  id: string;
  name: string;
  nodes: PathNode[]; // ordered
  closed: boolean;
  strokeWidth: number;
  strokeColor: string;
  bezier?: boolean; // render with smoothing
}

interface ProDrawEditorProps {
  isOpen: boolean;
  onClose: () => void;
  assetId?: string;
  assetSrc?: string;
  // When provided, editor loads existing object for re-edit
  editTarget?: {
    id: string;
    rect: { x: number; y: number; w: number; h: number };
    assetSrc: string;
    points: Point[];
    properties?: any;
  } | null;
  // Render mode: default 'modal' (fullscreen overlay) or 'floating' (draggable panel)
  variant?: 'modal' | 'floating';
  // When provided, editor is launched from a plain image on canvas and should replace it on save
  sourceImage?: {
    id: string;
    rect: { x: number; y: number; w: number; h: number };
    assetSrc: string;
  } | null;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Simplify path with Ramer–Douglas–Peucker (basic)
function simplify(points: Point[], tolerance = 1.5): Point[] {
  if (points.length < 3) return points;
  const sqTolerance = tolerance * tolerance;

  const getSqSegDist = (p: Point, p1: Point, p2: Point) => {
    let x = p1.x;
    let y = p1.y;
    let dx = p2.x - x;
    let dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = p2.x; y = p2.y; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p.x - x; dy = p.y - y;
    return dx * dx + dy * dy;
  };

  const simplifyDP = (pts: Point[], first: number, last: number, sqTol: number, out: Point[]) => {
    let maxSqDist = sqTol;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegDist(pts[i], pts[first], pts[last]);
      if (sqDist > maxSqDist) { index = i; maxSqDist = sqDist; }
    }
    if (index !== -1) {
      if (index - first > 1) simplifyDP(pts, first, index, sqTol, out);
      out.push(pts[index]);
      if (last - index > 1) simplifyDP(pts, index, last, sqTol, out);
    }
  };

  const out: Point[] = [points[0]];
  simplifyDP(points, 0, points.length - 1, sqTolerance, out);
  out.push(points[points.length - 1]);
  return out;
}

// Lightweight image loader hook (avoids external dependency)
function useImageCompat(src?: string, crossOrigin?: string): [HTMLImageElement | null] {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const image = new Image();
    if (crossOrigin) image.crossOrigin = crossOrigin as any;
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = src;
    return () => { setImg(null); };
  }, [src, crossOrigin]);
  return [img];
}

const ProDrawEditor: React.FC<ProDrawEditorProps> = ({ isOpen, onClose, assetId, assetSrc, editTarget, variant = 'modal', sourceImage }) => {
  console.log('ProDrawEditor function called with props:', { isOpen, variant, assetSrc, assetId });
  const { addObject, updateObject, removeObject, currentProject } = useAppStore();
  const originalRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Canvas and view state
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 960, height: 620 });
  // Floating window position & size
  const [winPos, setWinPos] = useState<{ top: number; left: number }>({ 
    top: 64, 
    left: typeof window !== 'undefined' ? Math.max(20, (window.innerWidth - 720) / 2) : 100 
  });
  const [winSize, setWinSize] = useState<{ width: number; height: number }>({ width: 720, height: 600 });
  const draggingRef = useRef<{ dx: number; dy: number; active: boolean }>({ dx: 0, dy: 0, active: false });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Asset image
  const pickSrc = () => {
    if (editTarget && (editTarget as any).assetSrc) return (editTarget as any).assetSrc as string;
    if (sourceImage && sourceImage.assetSrc) return sourceImage.assetSrc;
    return assetSrc || '';
  };
  const [image] = useImageCompat(pickSrc(), 'anonymous');
  const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 400, h: 400 });

  // Paths
  const [paths, setPaths] = useState<PathData[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'add' | 'free' | 'erase'>('add');
  const [insertMode, setInsertMode] = useState(false);
  const [tension, setTension] = useState(0.4); // simple smoothing for Line
  const [preview, setPreview] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [hand, setHand] = useState<'none' | 'pencil' | 'marker' | 'brush'>('pencil');
  const [handVariant, setHandVariant] = useState<'right-light'|'right-medium'|'right-dark'|'left-light'|'left-medium'|'left-dark'>('right-light');
  const [handOffset, setHandOffset] = useState<{x:number;y:number}>({ x: 16, y: 8 });
  const [handScale, setHandScale] = useState<number>(1);
  const [penOffset, setPenOffset] = useState<{x:number;y:number}>({ x: 0, y: 0 });
  const [penScale, setPenScale] = useState<number>(1);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('#ffffff');

  // Reset everything back to initial defaults
  const resetAll = () => {
    if (!window.confirm('Reset all paths and settings? This cannot be undone.')) return;
    setPaths([]);
    setActivePathId(null);
    setSelectedNodeId(null);
    setTool('add');
    setInsertMode(false);
    setTension(0.4);
    setPreview(false);
    setHand('pencil');
    setHandVariant('right-light');
    setHandOffset({ x: 16, y: 8 });
    setHandScale(1);
    setPenOffset({ x: 0, y: 0 });
    setPenScale(1);
    setStrokeWidth(3);
    setStrokeColor('#ffffff');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Fit image when loaded or modal opens
  useEffect(() => {
    if (!isOpen) return;
  // Lock background scroll while editor is open
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
    const calcStage = () => {
      const el = containerRef.current;
      if (!el) return;
      const pad = 24;
      const w = Math.max(480, el.clientWidth - pad);
      const h = Math.max(360, el.clientHeight - pad);
      setStageSize({ width: w, height: h });
    };
    calcStage();
    window.addEventListener('resize', calcStage);
    // Track wrapper size changes (for floating resize)
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window && wrapperRef.current) {
      ro = new ResizeObserver(() => calcStage());
      ro.observe(wrapperRef.current);
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); setSpaceDown(true); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); setSpaceDown(false); setIsDraggingView(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('resize', calcStage);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (ro) ro.disconnect();
  // restore body scroll
  document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!image) return;
    // If editing existing object, respect its rect
    if (editTarget) {
      originalRectRef.current = { x: editTarget.rect.x, y: editTarget.rect.y, w: editTarget.rect.w, h: editTarget.rect.h };
      // Place locally within editor with small padding; keep size same as canvas object
      const pad = 12;
      const w = editTarget.rect.w; const h = editTarget.rect.h;
      // If too large for stage, scale down to fit while preserving aspect
      const maxW = Math.max(200, stageSize.width - 240 - pad * 2);
      const maxH = Math.max(160, stageSize.height - 32 - pad * 2);
      const scale = Math.min(1, Math.min(maxW / w, maxH / h));
      setImgRect({ x: pad, y: pad, w: Math.round(w * scale), h: Math.round(h * scale) });
      return;
    }
    // If launched from an image on canvas, respect its rect too
    if (sourceImage) {
      originalRectRef.current = { x: sourceImage.rect.x, y: sourceImage.rect.y, w: sourceImage.rect.w, h: sourceImage.rect.h };
      const pad = 12;
      const w = sourceImage.rect.w; const h = sourceImage.rect.h;
      const maxW = Math.max(200, stageSize.width - 240 - pad * 2);
      const maxH = Math.max(160, stageSize.height - 32 - pad * 2);
      const scale = Math.min(1, Math.min(maxW / w, maxH / h));
      setImgRect({ x: pad, y: pad, w: Math.round(w * scale), h: Math.round(h * scale) });
      return;
    }
    const maxW = stageSize.width - 240; // leave room for right panel
    const maxH = stageSize.height - 32;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const w = Math.round(image.width * scale);
    const h = Math.round(image.height * scale);
    const x = Math.round((maxW - w) / 2) + 12;
    const y = Math.round((maxH - h) / 2) + 12;
    setImgRect({ x, y, w, h });
  }, [image, stageSize, editTarget, sourceImage]);

  // If editing, seed paths and tool settings from existing points/properties
  useEffect(() => {
    if (!isOpen || !editTarget) return;
    const pts = editTarget.points || [];
    const epsilon = 0.01;
    const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
    const list: PathData[] = [];
    let current: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const prev = i > 0 ? pts[i - 1] : null;
      if (prev && dist(prev, p) <= epsilon && current.length > 0) {
        // gap marker encountered; finalize current
        const pd: PathData = {
          id: `path-${Date.now()}-${list.length}`,
          name: `Path ${list.length + 1}`,
          nodes: current.map((pp, idx) => ({ id: `n-${Date.now()}-${idx}`, p: { x: pp.x, y: pp.y }, type: 'corner' })),
          closed: false,
          strokeWidth: editTarget.properties?.strokeWidth ?? strokeWidth,
          strokeColor: editTarget.properties?.strokeColor ?? '#ffffff',
          bezier: false,
        };
        list.push(pd);
        current = [];
      } else {
        current.push(p);
      }
    }
    if (current.length > 0) {
      const pd: PathData = {
        id: `path-${Date.now()}-${list.length}`,
        name: `Path ${list.length + 1}`,
        nodes: current.map((pp, idx) => ({ id: `n-${Date.now()}-${idx}`, p: { x: pp.x, y: pp.y }, type: 'corner' })),
        closed: false,
        strokeWidth: editTarget.properties?.strokeWidth ?? strokeWidth,
        strokeColor: editTarget.properties?.strokeColor ?? '#ffffff',
        bezier: false,
      };
      list.push(pd);
    }
    setPaths(list);
    setActivePathId(list[0]?.id ?? null);
    // tool/hand options
    const penType = editTarget.properties?.selectedPenType as ('pencil'|'marker'|'brush'|'pen'|undefined);
    if (penType) {
      setHand(penType === 'pencil' ? 'pencil' : penType === 'marker' ? 'marker' : penType === 'brush' ? 'brush' : 'pencil');
    }
    if (editTarget.properties?.selectedHandAsset) setHandVariant(editTarget.properties.selectedHandAsset);
    if (editTarget.properties?.handOffset) setHandOffset(editTarget.properties.handOffset);
    if (editTarget.properties?.handScale) setHandScale(editTarget.properties.handScale);
    if (editTarget.properties?.penOffset) setPenOffset(editTarget.properties.penOffset);
    if (editTarget.properties?.penScale) setPenScale(editTarget.properties.penScale);
    if (editTarget.properties?.strokeWidth) setStrokeWidth(editTarget.properties.strokeWidth);
    if (editTarget.properties?.strokeColor) setStrokeColor(editTarget.properties.strokeColor);
  }, [isOpen, editTarget, strokeWidth]);

  const activePath = useMemo(() => paths.find(p => p.id === activePathId) || null, [paths, activePathId]);

  // Create and select a new empty path immediately
  const createNewPath = () => {
    const id = `path-${Date.now()}`;
    const newPath: PathData = {
      id,
      name: `Path ${paths.length + 1}`,
      nodes: [],
      closed: false,
      strokeWidth,
      strokeColor,
    };
    setPaths(prev => [...prev, newPath]);
    setActivePathId(id);
    setTool('add');
  };

  // Tools handlers
  // Convert a point from stage coordinates into image-local coordinates
  const stageToImage = (pt: Point): Point => ({
    x: clamp(pt.x - imgRect.x, 0, imgRect.w),
    y: clamp(pt.y - imgRect.y, 0, imgRect.h),
  });

  // Get pointer position in stage coordinates (accounting for stage scale/translation)
  const getStagePointer = (e: any): Point | null => {
    const stage = e.target.getStage();
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const tr = stage.getAbsoluteTransform().copy();
    tr.invert();
    const p = tr.point(pos);
    return { x: p.x, y: p.y };
  };

  const handleClickAdd = (pos: Point) => {
    const p = stageToImage(pos);
    if (!activePath) {
      const id = `path-${Date.now()}`;
      const newPath: PathData = {
        id, name: `Path ${paths.length + 1}`, nodes: [{ id: `n-${Date.now()}`, p, type: 'corner' }],
        closed: false, strokeWidth, strokeColor,
      };
      setPaths(prev => [...prev, newPath]);
      setActivePathId(id);
    } else {
      const node: PathNode = { id: `n-${Date.now()}`, p, type: 'corner' };
      setPaths(prev => prev.map(path => path.id === activePath.id ? { ...path, nodes: [...path.nodes, node] } : path));
    }
  };

  // Insert node on nearest segment for active path
  const insertNodeOnSegment = (pos: Point) => {
    if (!activePath) return;
    const p = stageToImage(pos);
    if (activePath.nodes.length < 2) return;
    // find nearest segment
    const nodes = activePath.nodes;
    let bestIdx = -1;
    let bestDist = Infinity;
    const sq = (a: Point, b: Point) => (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y);
    const segDist = (p: Point, a: Point, b: Point) => {
      // squared distance to segment
      const abx = b.x - a.x, aby = b.y - a.y;
      const apx = p.x - a.x, apy = p.y - a.y;
      const ab2 = abx*abx + aby*aby;
      const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx*abx + apy*aby) / ab2));
      const proj = { x: a.x + t*abx, y: a.y + t*aby };
      return sq(p, proj);
    };
    for (let i = 0; i < nodes.length - 1; i++) {
      const d = segDist(p, nodes[i].p, nodes[i+1].p);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx >= 0) {
      const newNode: PathNode = { id: `n-${Date.now()}`, p, type: 'corner' };
      setPaths(prev => prev.map(path => path.id === activePath.id ? { ...path, nodes: [
        ...path.nodes.slice(0, bestIdx+1), newNode, ...path.nodes.slice(bestIdx+1)
      ] } : path));
      setSelectedNodeId(newNode.id);
    }
  };

  const handleNodeDrag = (pathId: string, nodeId: string, pos: Point) => {
    const p = stageToImage(pos);
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      return { ...path, nodes: path.nodes.map(n => n.id === nodeId ? { ...n, p } : n) };
    }));
  };

  const handleDeleteNode = (pathId: string, nodeId: string) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      return { ...path, nodes: path.nodes.filter(n => n.id !== nodeId) };
    }));
  };

  const handleFreehand = (poly: Point[]) => {
    const simplified = simplify(poly, 2);
    const id = `path-${Date.now()}`;
    const nodes: PathNode[] = simplified.map((p, i) => ({ id: `n-${i}-${Date.now()}`, p, type: 'corner' }));
    setPaths(prev => [...prev, { id, name: `Path ${prev.length + 1}`, nodes, closed: false, strokeWidth, strokeColor }]);
    setActivePathId(id);
  };

  // Stage mouse events for tools
  const drawingRef = useRef<Point[] | null>(null);
  const onStageMouseDown = (e: any) => {
    if (!image) return;
    // Only left button draws
    if (e.evt && e.evt.button !== 0) return;
    // If panning, do not handle drawing
    if (panMode || spaceDown) { setIsDraggingView(true); return; }
    const pos = getStagePointer(e);
    if (!pos) return;
    if (tool === 'add') {
      if (insertMode) insertNodeOnSegment(pos);
      else handleClickAdd(pos);
    }
    if (tool === 'free') drawingRef.current = [pos];
  };
  const onStageMouseMove = (e: any) => {
    if (tool !== 'free' || !drawingRef.current) return;
    const pos = getStagePointer(e);
    if (!pos) return;
    drawingRef.current.push(pos);
  };
  const onStageMouseUpGlobal = () => setIsDraggingView(false);
  useEffect(() => {
    window.addEventListener('mouseup', onStageMouseUpGlobal);
    return () => window.removeEventListener('mouseup', onStageMouseUpGlobal);
  }, []);
  const onStageMouseUp = () => {
    if (tool !== 'free' || !drawingRef.current) return;
    const pts = drawingRef.current.map(p => stageToImage(p));
    drawingRef.current = null;
    if (pts.length > 3) handleFreehand(pts);
  };

  // Path ordering
  const movePath = (id: string, dir: -1 | 1) => {
    setPaths(prev => {
      const i = prev.findIndex(p => p.id === id);
      if (i < 0) return prev;
      const j = clamp(i + dir, 0, prev.length - 1);
      if (i === j) return prev;
      const arr = [...prev];
      const [item] = arr.splice(i, 1);
      arr.splice(j, 0, item);
      return arr;
    });
  };

  // Preview support: create flat polyline from nodes
  const toFlatPoints = (path: PathData): number[] => {
    const pts: number[] = [];
    path.nodes.forEach(n => { pts.push(imgRect.x + n.p.x, imgRect.y + n.p.y); });
    if (path.closed && path.nodes.length > 2) {
      const n0 = path.nodes[0];
      pts.push(imgRect.x + n0.p.x, imgRect.y + n0.p.y);
    }
    return pts;
  };

  // Save & Apply to canvas
  const applyToCanvas = () => {
    if (!currentProject || paths.length === 0) { onClose(); return; }
    const allPoints: Point[] = [];
    // Concatenate all paths in order with small gap to lift pen
    paths.forEach((p, idx) => {
      p.nodes.forEach(n => allPoints.push({ x: n.p.x, y: n.p.y }));
      if (idx < paths.length - 1) allPoints.push({ x: allPoints[allPoints.length-1].x + 0.001, y: allPoints[allPoints.length-1].y + 0.001 });
    });
    if (editTarget) {
      // Update existing object
      const existing = currentProject.objects?.find((o: any) => o.id === editTarget.id);
      const newProps = {
        ...(existing?.properties || {}),
        points: allPoints,
        strokeColor,
        strokeWidth,
    assetSrc: editTarget.assetSrc,
        selectedPenType: hand === 'pencil' ? 'pencil' : hand === 'marker' ? 'marker' : hand === 'brush' ? 'brush' : 'pen',
        selectedHandAsset: handVariant,
        handRotation: true,
        handOffset,
        handScale,
        penOffset,
        penScale,
      };
      const orc = originalRectRef.current || editTarget.rect;
      updateObject(editTarget.id, {
        x: orc.x,
        y: orc.y,
        width: orc.w,
        height: orc.h,
        properties: newProps,
      });
      onClose();
      return;
    }
    const resolvedAssetSrc: string = (editTarget ? (editTarget as any).assetSrc : '') || (sourceImage ? sourceImage.assetSrc : '') || (assetSrc || '');
    const obj = {
      id: `drawpath-${Date.now()}`,
      type: 'drawPath' as const,
      x: (originalRectRef.current?.x ?? imgRect.x),
      y: (originalRectRef.current?.y ?? imgRect.y),
      width: (originalRectRef.current?.w ?? imgRect.w),
      height: (originalRectRef.current?.h ?? imgRect.h),
      properties: {
        pathName: `Pro Path ${new Date().toLocaleTimeString()}`,
        points: allPoints,
        strokeColor: strokeColor,
  strokeWidth: strokeWidth,
    assetSrc: resolvedAssetSrc,
        selectedPenType: hand === 'pencil' ? 'pencil' : hand === 'marker' ? 'marker' : hand === 'brush' ? 'brush' : 'pen',
        selectedHandAsset: handVariant,
        handRotation: true,
        handOffset,
        handScale,
        penOffset,
        penScale,
      },
      animationStart: 0,
      animationDuration: 3,
      animationType: 'drawIn' as const,
      animationEasing: 'linear' as const,
    };
    addObject(obj);
  // If launched from image, remove the original image to "replace" it
  if (sourceImage?.id) {
    removeObject(sourceImage.id);
  }
    onClose();
  };

  if (!isOpen) {
    console.log('ProDrawEditor early return - isOpen is false, received isOpen:', isOpen);
    return null;
  }

  console.log('ProDrawEditor continuing to render - isOpen is true');

  // Common header with drag support when floating
  const Header = (
    <div
      className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 select-none"
      style={{ cursor: variant === 'floating' ? 'move' : 'default' }}
      onMouseDown={(e) => {
        if (variant !== 'floating') return;
        draggingRef.current = { dx: e.clientX - winPos.left, dy: e.clientY - winPos.top, active: true };
        const onMove = (ev: MouseEvent) => {
          if (!draggingRef.current.active) return;
          setWinPos({ top: Math.max(8, ev.clientY - draggingRef.current.dy), left: Math.max(8, ev.clientX - draggingRef.current.dx) });
        };
        const onUp = () => {
          draggingRef.current.active = false;
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }}
    >
      <div className="font-semibold">Pro Draw Editor</div>
      <button onClick={onClose} className="text-gray-300 hover:text-white text-lg">✕</button>
    </div>
  );

  // Shared editor body (left canvas + right inspector)
  const editorBody = (
    <div className="flex-1 overflow-hidden flex">
      {/* Left: Editor */}
      <div ref={containerRef} className="flex-1 relative min-w-[320px]">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          scaleX={zoom}
          scaleY={zoom}
          x={offset.x}
          y={offset.y}
          ref={stageRef}
          draggable={panMode || spaceDown}
          onDragMove={(e) => { setOffset({ x: e.target.x(), y: e.target.y() }); setIsDraggingView(true); }}
          onDragEnd={(e) => { setOffset({ x: e.target.x(), y: e.target.y() }); setIsDraggingView(false); }}
          onMouseDown={onStageMouseDown}
          onMouseMove={onStageMouseMove}
          onMouseUp={onStageMouseUp}
          style={{ cursor: (panMode || spaceDown) ? (isDraggingView ? 'grabbing' : 'grab') : (tool==='add' || tool==='free') ? 'crosshair' : 'default' }}
        >
          <Layer>
            {/* Image */}
            {image && (
              <KonvaImage image={image} x={imgRect.x} y={imgRect.y} width={imgRect.w} height={imgRect.h} />
            )}

            {/* Paths */}
            {paths.map((p, idx) => (
              <Group key={p.id}>
                {/* Order label */}
                {p.nodes[0] && (
                  <Text x={imgRect.x + p.nodes[0].p.x - 10} y={imgRect.y + p.nodes[0].p.y - 24} text={`${idx + 1}`} fontSize={12} fill="#22d3ee" />
                )}
                {/* Segments */}
                {p.nodes.length > 1 && (
                  <Line
                    points={toFlatPoints(p)}
                    stroke={p.strokeColor}
                    strokeWidth={p.strokeWidth}
                    lineCap="round"
                    lineJoin="round"
                    tension={p.bezier ? Math.max(0.1, tension) : 0}
                  />
                )}
                {/* Nodes */}
                {p.nodes.map((n) => (
                  <Circle
                    key={n.id}
                    x={imgRect.x + n.p.x}
                    y={imgRect.y + n.p.y}
                    radius={6}
                    fill={selectedNodeId === n.id ? '#a78bfa' : (n.type === 'smooth' ? '#34d399' : '#22d3ee')}
                    draggable
                    onDragMove={(e) => handleNodeDrag(p.id, n.id, { x: e.target.x(), y: e.target.y() })}
                    onClick={(e) => {
                      setActivePathId(p.id);
                      setSelectedNodeId(n.id);
                      if (e.evt.shiftKey) {
                        setPaths(prev => prev.map(x => x.id === p.id ? { ...x, nodes: x.nodes.map(nn => nn.id === n.id ? { ...nn, type: nn.type==='corner'?'smooth':'corner' } : nn) } : x));
                      }
                    }}
                    onDblClick={() => handleDeleteNode(p.id, n.id)}
                  />
                ))}
              </Group>
            ))}

            {/* Preview hand/pen indicator at last node of active path */}
            {preview && activePath && activePath.nodes.length > 0 && (
              <Group>
                <Text text={hand === 'pencil' ? '✏️' : hand === 'marker' ? '🖍️' : hand === 'brush' ? '🖌️' : '🖊️'}
                      x={imgRect.x + activePath.nodes[activePath.nodes.length-1].p.x + 8}
                      y={imgRect.y + activePath.nodes[activePath.nodes.length-1].p.y - 8}
                      fontSize={22} />
              </Group>
            )}
          </Layer>
        </Stage>

        {/* Top overlay controls */}
        <div className="absolute top-2 left-2 flex gap-2">
          <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => setTool('add')}>Add Nodes</button>
          <button className="px-2 py-1 bg-gray-700 rounded" onClick={createNewPath}>New Path</button>
          <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => setTool('free')}>Freehand</button>
          <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => setPreview(p => !p)}>{preview ? 'Hide Preview' : 'Live Preview'}</button>
          <label className="px-2 py-1 bg-gray-800 rounded inline-flex items-center gap-1 text-xs">
            <input type="checkbox" checked={insertMode} onChange={(e) => setInsertMode(e.target.checked)} /> Insert Node
          </label>
          <label className="px-2 py-1 bg-gray-800 rounded inline-flex items-center gap-1 text-xs" title="Hold Space to pan temporarily">
            <input type="checkbox" checked={panMode} onChange={(e) => setPanMode(e.target.checked)} /> Pan
          </label>
        </div>
      </div>

      {/* Right: Inspector */}
      <div className={`${variant === 'floating' ? 'w-[340px]' : 'w-[280px]'} shrink-0 border-l border-gray-700 p-3 overflow-y-auto bg-gray-800`}>
        {/* Tools (mirrors top overlay) */}
        <div>
          <div className="text-xs text-gray-400 mb-1">Tools</div>
          <div className="flex flex-wrap gap-2">
            <button className={`px-2 py-1 rounded ${tool==='add'?'bg-emerald-600':'bg-gray-700'}`} onClick={() => setTool('add')}>Add Nodes</button>
            <button className={`px-2 py-1 rounded ${tool==='free'?'bg-emerald-600':'bg-gray-700'}`} onClick={() => setTool('free')}>Freehand</button>
            <label className="px-2 py-1 bg-gray-700 rounded inline-flex items-center gap-1 text-xs">
              <input type="checkbox" checked={insertMode} onChange={(e) => setInsertMode(e.target.checked)} /> Insert Node
            </label>
            <label className="px-2 py-1 bg-gray-700 rounded inline-flex items-center gap-1 text-xs" title="Hold Space to pan temporarily">
              <input type="checkbox" checked={panMode} onChange={(e) => setPanMode(e.target.checked)} /> Pan
            </label>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Tip: Hold Space to pan; use New Path for each letter.</div>
        </div>
        {/* Zoom */}
        <div className="mt-2">
          <div className="text-xs text-gray-400 mb-1">View</div>
          <div className="flex gap-2">
            <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => setZoom(z => clamp(z*1.2, 0.25, 4))}>Zoom +</button>
            <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => setZoom(z => clamp(z/1.2, 0.25, 4))}>Zoom -</button>
            <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>Reset</button>
          </div>
        </div>

        {/* Paths list */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-gray-400">Paths ({paths.length})</div>
            <button className="px-2 py-0.5 bg-gray-700 rounded text-xs" onClick={createNewPath}>＋ New</button>
          </div>
          <div className="space-y-2">
            {paths.map((p) => (
              <div key={p.id} className={`p-2 rounded bg-gray-700 ${activePathId === p.id ? 'ring-2 ring-emerald-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <input className="bg-transparent text-sm flex-1 mr-2" value={p.name}
                         onChange={(e) => setPaths(prev => prev.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))} />
                  <div className="flex gap-1">
                    <button className="px-1 bg-gray-600 rounded" onClick={() => movePath(p.id, -1)}>↑</button>
                    <button className="px-1 bg-gray-600 rounded" onClick={() => movePath(p.id, +1)}>↓</button>
                    <button className="px-1 bg-red-600 rounded" onClick={() => setPaths(prev => prev.filter(x => x.id !== p.id))}>🗑</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={p.closed} onChange={(e) => setPaths(prev => prev.map(x => x.id === p.id ? { ...x, closed: e.target.checked } : x))} /> Close</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={!!p.bezier} onChange={(e) => setPaths(prev => prev.map(x => x.id === p.id ? { ...x, bezier: e.target.checked } : x))} /> Bezier</label>
                  <label>Width <input type="number" className="w-12 bg-gray-600 rounded px-1" value={p.strokeWidth} min={1} max={20} onChange={(e) => setPaths(prev => prev.map(x => x.id === p.id ? { ...x, strokeWidth: Number(e.target.value) } : x))} /></label>
                  <input type="color" value={p.strokeColor} onChange={(e) => setPaths(prev => prev.map(x => x.id === p.id ? { ...x, strokeColor: e.target.value } : x))} />
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <button className="px-2 py-1 bg-gray-600 rounded" onClick={() => {
                    // Delete selected segment (remove node after selected)
                    if (!selectedNodeId) return;
                    setPaths(prev => prev.map(x => {
                      if (x.id !== p.id) return x;
                      const idx = x.nodes.findIndex(n => n.id === selectedNodeId);
                      if (idx >= 0 && idx < x.nodes.length - 1) {
                        const nodes = [...x.nodes];
                        nodes.splice(idx + 1, 1);
                        return { ...x, nodes };
                      }
                      return x;
                    }));
                  }}>Delete Segment</button>
                  <button className="px-2 py-1 bg-gray-600 rounded" onClick={() => {
                    // Merge with next (remove current if not first/last)
                    if (!selectedNodeId) return;
                    setPaths(prev => prev.map(x => {
                      if (x.id !== p.id) return x;
                      const idx = x.nodes.findIndex(n => n.id === selectedNodeId);
                      if (idx > 0 && idx < x.nodes.length - 1) {
                        const nodes = [...x.nodes];
                        nodes.splice(idx, 1);
                        return { ...x, nodes };
                      }
                      return x;
                    }));
                  }}>Merge</button>
                </div>
                <div className="mt-2">
                  <button className="text-xs px-2 py-1 bg-gray-600 rounded mr-2" onClick={() => { setActivePathId(p.id); setTool('add'); }}>Edit</button>
                  <button className="text-xs px-2 py-1 bg-gray-600 rounded" onClick={() => setActivePathId(p.id)}>Select</button>
                </div>
              </div>
            ))}
            {paths.length === 0 && (
              <div className="text-xs text-gray-400 p-2 bg-gray-700 rounded">Use Add Nodes or Freehand to start a path.</div>
            )}
          </div>
        </div>

        {/* Global settings */}
        <div className="mt-3">
          <div className="text-xs text-gray-400 mb-1">Global</div>
          <div className="flex items-center gap-2 mb-2">
            <label>Width <input type="number" className="w-14 bg-gray-700 rounded px-1" value={strokeWidth} min={1} max={20} onChange={(e) => setStrokeWidth(Number(e.target.value))} /></label>
            <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs">Smoothing</label>
            <input type="range" min={0} max={0.9} step={0.1} value={tension} onChange={(e) => setTension(Number(e.target.value))} />
            <div className="text-xs w-8 text-right">{tension.toFixed(1)}</div>
          </div>
          <div className="text-xs text-gray-400 mb-1">Hand / Pen</div>
          <div className="grid grid-cols-3 gap-2">
            {(['pencil','marker','brush'] as const).map(k => (
              <button key={k} className={`p-2 rounded ${hand===k?'bg-emerald-600':'bg-gray-700'}`} onClick={() => setHand(k)}>
                <div className="text-lg">{k==='pencil'?'✏️':k==='marker'?'🖍️':'🖌️'}</div>
                <div className="text-[10px] capitalize">{k}</div>
              </button>
            ))}
            <button className={`p-2 rounded ${hand==='none'?'bg-emerald-600':'bg-gray-700'}`} onClick={() => setHand('none')}>
              <div className="text-lg">🚫</div>
              <div className="text-[10px]">none</div>
            </button>
          </div>

          {/* Hand variant picker */}
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1">Hand Variant</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['right-light','right-medium','right-dark','left-light','left-medium','left-dark'] as const).map(v => (
                <button key={v} className={`px-2 py-1 rounded ${handVariant===v?'bg-emerald-600':'bg-gray-700'}`} onClick={() => setHandVariant(v)}>
                  {v.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Tool offsets & scale */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-700 rounded">
              <div className="mb-1 font-semibold text-[11px]">Hand Offset/Scale</div>
              <label>Off X <input type="number" className="w-14 bg-gray-800 rounded px-1" value={handOffset.x} onChange={(e)=>setHandOffset({ ...handOffset, x:Number(e.target.value)})} /></label>
              <label className="ml-2">Off Y <input type="number" className="w-14 bg-gray-800 rounded px-1" value={handOffset.y} onChange={(e)=>setHandOffset({ ...handOffset, y:Number(e.target.value)})} /></label>
              <div className="mt-1">
                <label>Scale <input type="number" min={0.5} max={2} step={0.1} className="w-16 bg-gray-800 rounded px-1" value={handScale} onChange={(e)=>setHandScale(Number(e.target.value))} /></label>
              </div>
            </div>
            <div className="p-2 bg-gray-700 rounded">
              <div className="mb-1 font-semibold text-[11px]">Pen Offset/Scale</div>
              <label>Off X <input type="number" className="w-14 bg-gray-800 rounded px-1" value={penOffset.x} onChange={(e)=>setPenOffset({ ...penOffset, x:Number(e.target.value)})} /></label>
              <label className="ml-2">Off Y <input type="number" className="w-14 bg-gray-800 rounded px-1" value={penOffset.y} onChange={(e)=>setPenOffset({ ...penOffset, y:Number(e.target.value)})} /></label>
              <div className="mt-1">
                <label>Scale <input type="number" min={0.5} max={2} step={0.1} className="w-16 bg-gray-800 rounded px-1" value={penScale} onChange={(e)=>setPenScale(Number(e.target.value))} /></label>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-3 border-t border-gray-700 flex gap-2">
            <button className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded" onClick={applyToCanvas}>Save & Apply</button>
            <button className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded" onClick={resetAll}>Reset All</button>
            <button className="px-3 py-2 bg-gray-700 rounded" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === 'floating') {
    console.log('ProDrawEditor rendering floating variant with position:', winPos, 'and size:', winSize);
    const floating = (
      <div
        ref={wrapperRef}
        style={{ 
          position: 'fixed',
          top: winPos.top, 
          left: winPos.left, 
          width: winSize.width, 
          height: winSize.height,
          backgroundColor: '#1f2937',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #374151',
          overflow: 'hidden',
          zIndex: 999999,
          resize: 'both'
        }}
        onMouseUp={() => {
          // Capture size after manual resize via CSS handle
          if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setWinSize({ width: rect.width, height: rect.height });
          }
        }}
      >
        {Header}
        <div style={{ width: '100%', height: 'calc(100% - 40px)', overflow: 'hidden', display: 'flex' }}>
          {editorBody}
        </div>
      </div>
    );
    console.log('ProDrawEditor creating portal for floating variant');
    return createPortal(floating, document.body);
  }

  // Default: modal fullscreen using portal to the document body (avoid panel clipping)
  const modal = (
    <div className="bg-gray-900 text-white rounded-lg shadow-2xl w-full h-full overflow-hidden flex flex-col border border-gray-600">
      {Header}
      {editorBody}
    </div>
  );
  return modal;
};

export default ProDrawEditor;
