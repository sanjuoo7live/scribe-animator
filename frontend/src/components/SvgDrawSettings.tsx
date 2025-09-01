import React from 'react';

export type SvgDrawMode = 'standard' | 'preview' | 'batched';

export interface SvgDrawOptions {
  mode: SvgDrawMode; // standard=fill at end, preview=fill per path, batched=fill in N chunks
  speed: { kind: 'duration' | 'pps'; durationSec?: number; pps?: number };
  previewStroke?: { color: string; widthBoost: number };
  fillStrategy?: { kind: 'afterAll' | 'perPath' | 'batched'; batchesN?: number };
}

export const defaultSvgDrawOptions: SvgDrawOptions = {
  mode: 'standard',
  speed: { kind: 'duration', durationSec: 3 },
  previewStroke: { color: '#3b82f6', widthBoost: 1 },
  fillStrategy: { kind: 'afterAll', batchesN: 4 },
};

type Props = {
  value: Partial<SvgDrawOptions> | undefined;
  onChange: (next: SvgDrawOptions) => void;
  // Optional: total length and current duration to compute helpful hints
  totalLen?: number;
  currentDurationSec?: number;
  compact?: boolean;
};

export const SvgDrawSettings: React.FC<Props> = ({ value, onChange, totalLen, currentDurationSec, compact }) => {
  const v = React.useMemo(() => ({ ...defaultSvgDrawOptions, ...(value || {}) }), [value]);

  const update = (patch: Partial<SvgDrawOptions>) => {
    const next = { ...v, ...patch } as SvgDrawOptions;
    // keep fillStrategy aligned with mode by default
    if (patch.mode) {
      next.fillStrategy =
        patch.mode === 'standard'
          ? { kind: 'afterAll', batchesN: next.fillStrategy?.batchesN ?? 4 }
          : patch.mode === 'preview'
          ? { kind: 'perPath', batchesN: next.fillStrategy?.batchesN ?? 4 }
          : { kind: 'batched', batchesN: next.fillStrategy?.batchesN ?? 4 };
    }
    onChange(next);
  };

  const updateSpeed = (patch: Partial<SvgDrawOptions['speed']>) => {
    onChange({ ...v, speed: { ...v.speed, ...patch } } as SvgDrawOptions);
  };

  const updatePreviewStroke = (patch: Partial<NonNullable<SvgDrawOptions['previewStroke']>>) => {
    onChange({ ...v, previewStroke: { ...(v.previewStroke || defaultSvgDrawOptions.previewStroke!), ...patch } } as SvgDrawOptions);
  };

  const updateFill = (patch: Partial<NonNullable<SvgDrawOptions['fillStrategy']>>) => {
    onChange({ ...v, fillStrategy: { ...(v.fillStrategy || defaultSvgDrawOptions.fillStrategy!), ...patch } } as SvgDrawOptions);
  };

  const effectiveDuration = v.speed.kind === 'duration'
    ? (v.speed.durationSec || currentDurationSec || 3)
    : totalLen && v.speed.pps
    ? Math.max(0.1, totalLen / Math.max(1, v.speed.pps))
    : (currentDurationSec || 3);

  return (
    <div className={(compact ? '' : 'p-2 rounded bg-gray-700/40 border border-gray-600 ') + 'w-full overflow-hidden'}>
      {!compact && (<h4 className="text-xs font-semibold text-gray-300 mb-2">Draw Settings</h4>)}
      <div className="text-xs w-full min-w-0" style={{ paddingTop: 12, paddingBottom: 12 }}>
        {/* Row 1: Mode */}
        <div className="flex items-center" style={{ gap: 12, marginBottom: 12 }}>
          <span className="text-gray-300 flex-shrink-0" style={{ width: 84 }}>Mode</span>
          <select
            className="bg-gray-700 text-gray-100 rounded px-3 py-2 flex-1 min-w-0"
            value={v.mode}
            onChange={(e) => update({ mode: e.target.value as SvgDrawMode })}
          >
            <option value="standard">Standard (fill at end)</option>
            <option value="preview">Preview (fill per path)</option>
            <option value="batched">Batched</option>
          </select>
        </div>

        {/* Row 2: Speed */}
        <div className="flex items-center flex-wrap" style={{ gap: 12, marginBottom: 12 }}>
          <span className="text-gray-300 flex-shrink-0" style={{ width: 84 }}>Speed</span>
          <select
            className="bg-gray-700 text-gray-100 rounded px-3 py-2"
            style={{ width: 140, flexShrink: 0 }}
            value={v.speed.kind}
            onChange={(e) => updateSpeed({ kind: e.target.value as 'duration' | 'pps' })}
          >
            <option value="duration">By duration</option>
            <option value="pps">By pps</option>
          </select>
          {v.speed.kind === 'duration' ? (
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={v.speed.durationSec ?? currentDurationSec ?? 3}
              onChange={(e) => updateSpeed({ durationSec: Number(e.target.value) })}
              className="bg-gray-700 text-gray-100 rounded px-3 py-2 flex-shrink-0"
              style={{ width: 80 }}
            />
          ) : (
            <input
              type="number"
              min={1}
              step={10}
              value={v.speed.pps ?? 300}
              onChange={(e) => updateSpeed({ pps: Number(e.target.value) })}
              className="bg-gray-700 text-gray-100 rounded px-3 py-2 flex-shrink-0"
              style={{ width: 90 }}
            />
          )}
          <span className="text-gray-400 flex-shrink-0">
            (~{effectiveDuration.toFixed(1)}s)
          </span>
        </div>

        {/* Row 3: Preview stroke + Width boost */}
        <div className="flex items-center flex-wrap" style={{ gap: 12, marginBottom: 12 }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <span className="text-gray-300 flex-shrink-0" style={{ width: 84 }}>Preview stroke</span>
            <input
              type="color"
              value={v.previewStroke?.color || '#3b82f6'}
              onChange={(e) => updatePreviewStroke({ color: e.target.value })}
              className="border border-gray-500 rounded flex-shrink-0"
              style={{ width: 40, height: 32 }}
            />
          </div>
          <div className="flex items-center" style={{ gap: 12 }}>
            <span className="text-gray-300 flex-shrink-0" style={{ width: 84 }}>Width boost</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={v.previewStroke?.widthBoost ?? 1}
              onChange={(e) => updatePreviewStroke({ widthBoost: Number(e.target.value) })}
              className="bg-gray-700 text-gray-100 rounded px-3 py-2 flex-shrink-0"
              style={{ width: 80 }}
            />
          </div>
        </div>

        {/* Row 4: Batches */}
        {v.mode === 'batched' && (
          <div className="flex items-center" style={{ gap: 12, marginBottom: 0 }}>
            <span className="text-gray-300 flex-shrink-0" style={{ width: 84 }}>Batches</span>
            <input
              type="number"
              min={2}
              step={1}
              value={v.fillStrategy?.batchesN ?? 4}
              onChange={(e) => updateFill({ kind: 'batched', batchesN: Math.max(2, Number(e.target.value)) })}
              className="bg-gray-700 text-gray-100 rounded px-3 py-2 flex-shrink-0"
              style={{ width: 80 }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SvgDrawSettings;
