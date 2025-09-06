import type { ImportOptions, ImportedSvg, ImportedPath } from './types';
import type { ExtractedSvg } from './extractPaths';

// Color normalization using canvas to leverage the browser's parser
const colorCtx = (() => {
  try {
    // OffscreenCanvas works in workers; fall back to standard canvas otherwise
    const c = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(1, 1)
      : document.createElement('canvas');
    return (c as any).getContext('2d');
  } catch {
    return null;
  }
})();

// Minimal name→hex fallback for jsdom (no canvas context available)
const NAME_TO_HEX: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
};

function normalizeColor(value: string | undefined, opacity: number | undefined): { color?: string; opacity?: number } {
  if (!value || value === 'none' || value === 'transparent') return { color: 'none' };
  if (!colorCtx) {
    const hex = NAME_TO_HEX[value.toLowerCase?.() || ''];
    return { color: hex || value, opacity };
  }
  try {
    colorCtx.fillStyle = value;
    const computed = colorCtx.fillStyle as string; // rgb(...) or #hex
    if (computed.startsWith('#')) return { color: computed, opacity };
    const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(computed);
    if (m) {
      const hex = '#' + [m[1], m[2], m[3]].map(v => Number(v).toString(16).padStart(2, '0')).join('');
      return { color: hex, opacity };
    }
    return { color: computed, opacity };
  } catch {
    return { color: value, opacity };
  }
}

function hashPath(p: ImportedPath): string {
  const str = [p.d, p.stroke || '', p.fill || '', p.strokeWidth ?? '', p.opacity ?? ''].join('|');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function normalize(vetted: ExtractedSvg, _options: ImportOptions): ImportedSvg {
  const paths: ImportedPath[] = vetted.paths.map(p => {
    const norm = normalizeColor(p.fill, p.opacity);
    const strokeNorm = normalizeColor(p.stroke, undefined);
    const out: ImportedPath = {
      id: p.id,
      d: p.d,
      fill: norm.color,
      stroke: strokeNorm.color,
      strokeWidth: p.strokeWidth,
      opacity: norm.opacity ?? p.opacity,
      hash: ''
    };
    out.hash = hashPath(out);
    return out;
  });

  return {
    width: vetted.width,
    height: vetted.height,
    viewBox: vetted.viewBox,
    paths,
    warnings: vetted.warnings,
  };
}
