// Simple localStorage-backed store for per (hand, tool) calibration offsets
export type CalibrationOffset = { x: number; y: number };

const KEY = 'handToolCalibration.v1';

type CalibMap = Record<string, CalibrationOffset>;

function loadAll(): CalibMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj as CalibMap;
  } catch {}
  return {};
}

function saveAll(map: CalibMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

function makeKey(handId: string, toolId: string) {
  return `${handId}__${toolId}`;
}

export function getCalibration(handId: string, toolId: string): CalibrationOffset | null {
  const all = loadAll();
  return all[makeKey(handId, toolId)] || null;
}

export function setCalibration(handId: string, toolId: string, offset: CalibrationOffset) {
  const all = loadAll();
  all[makeKey(handId, toolId)] = { x: offset.x || 0, y: offset.y || 0 };
  saveAll(all);
}

export function clearCalibration(handId: string, toolId: string) {
  const all = loadAll();
  delete all[makeKey(handId, toolId)];
  saveAll(all);
}

export function listCalibrations(): Array<{ key: string; offset: CalibrationOffset }> {
  const all = loadAll();
  return Object.entries(all).map(([key, offset]) => ({ key, offset }));
}
