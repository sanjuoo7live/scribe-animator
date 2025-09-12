// Simple client for saving/loading hand+tool calibration settings

export interface CalibrationData {
  tipBacktrackPx?: number;
  calibrationOffset?: { x: number; y: number };
  nibAnchor?: { x: number; y: number };
  scale?: number;
  mirror?: boolean;
  showForeground?: boolean;
  toolRotationOffsetDeg?: number;
  calibrationBaseScale?: number;
  nibLock?: boolean;
}

function apiBase() {
  // Reuse the same convention used elsewhere in the app
  const base = (process.env.REACT_APP_API_BASE as string) || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');
  return base;
}

export async function loadCalibration(handId: string, toolId: string): Promise<CalibrationData | null> {
  if (!handId || !toolId) return null;
  const base = apiBase();
  if (!base) return null; // No backend configured; treat as optional
  try {
    const res = await fetch(`${base}/api/calibration/hand-tool/${encodeURIComponent(handId)}/${encodeURIComponent(toolId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.exists === false) return null;
    // Normalize to the shape we expect
    const out: CalibrationData = {};
    if (typeof data.tipBacktrackPx === 'number') out.tipBacktrackPx = data.tipBacktrackPx;
    if (data.calibrationOffset && typeof data.calibrationOffset.x === 'number' && typeof data.calibrationOffset.y === 'number') out.calibrationOffset = data.calibrationOffset;
    if (data.nibAnchor && typeof data.nibAnchor.x === 'number' && typeof data.nibAnchor.y === 'number') out.nibAnchor = data.nibAnchor;
    if (typeof data.scale === 'number') out.scale = data.scale;
    if (typeof data.mirror === 'boolean') out.mirror = data.mirror;
    if (typeof data.showForeground === 'boolean') out.showForeground = data.showForeground;
    if (typeof data.toolRotationOffsetDeg === 'number') out.toolRotationOffsetDeg = data.toolRotationOffsetDeg;
    if (typeof data.calibrationBaseScale === 'number') out.calibrationBaseScale = data.calibrationBaseScale;
    if (typeof data.nibLock === 'boolean') out.nibLock = data.nibLock;
    // If nothing meaningful was present, treat as null
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export async function saveCalibration(handId: string, toolId: string, calibration: CalibrationData): Promise<boolean> {
  const base = apiBase();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/api/calibration/hand-tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handId, toolId, calibration }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
