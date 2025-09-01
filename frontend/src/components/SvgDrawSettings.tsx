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
      <div className="grid grid-cols-2 gap-2 text-xs w-full min-w-0">
        <label className="flex items-center gap-2 col-span-2 w-full">
          <span className="text-gray-300 w-28">Mode</span>
          <select
            className="flex-1 min-w-0 bg-gray-700 text-gray-100 rounded px-2 py-1"
            value={v.mode}
            onChange={(e) => update({ mode: e.target.value as SvgDrawMode })}
          >
            <option value="standard">Standard (fill at end)</option>
            <option value="preview">Preview (fill per path)</option>
            <option value="batched">Batched</option>
          </select>
        </label>

        <label className="flex flex-wrap items-center gap-2 col-span-2 w-full">
          <span className="text-gray-300 w-28">Speed</span>
          <select
            className="bg-gray-700 text-gray-100 rounded px-2 py-1 w-32 shrink-0"
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
              className="bg-gray-700 text-gray-100 rounded px-2 py-1 w-20 shrink-0"
            />
          ) : (
            <input
              type="number"
              min={1}
              step={10}
              value={v.speed.pps ?? 300}
              onChange={(e) => updateSpeed({ pps: Number(e.target.value) })}
              className="bg-gray-700 text-gray-100 rounded px-2 py-1 w-24 shrink-0"
            />
          )}
          <span className="text-gray-400 shrink-0">
            (~{effectiveDuration.toFixed(1)}s)
          </span>
        </label>

        <div className="col-span-2 grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2">
            <span className="text-gray-300 w-28">Preview stroke</span>
            <input
              type="color"
              value={v.previewStroke?.color || '#3b82f6'}
              onChange={(e) => updatePreviewStroke({ color: e.target.value })}
              className="w-8 h-6 border border-gray-500 rounded"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-gray-300 w-28">Width boost</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={v.previewStroke?.widthBoost ?? 1}
              onChange={(e) => updatePreviewStroke({ widthBoost: Number(e.target.value) })}
              className="bg-gray-700 text-gray-100 rounded px-2 py-1 w-20 shrink-0"
            />
          </label>
        </div>

        {v.mode === 'batched' && (
          <label className="flex items-center gap-2 col-span-2 w-full">
            <span className="text-gray-300 w-28">Batches</span>
            <input
              type="number"
              min={2}
              step={1}
              value={v.fillStrategy?.batchesN ?? 4}
              onChange={(e) => updateFill({ kind: 'batched', batchesN: Math.max(2, Number(e.target.value)) })}
              className="bg-gray-700 text-gray-100 rounded px-2 py-1 w-20 shrink-0"
            />
          </label>
        )}
      </div>
    </div>
  );
};

export default SvgDrawSettings;
