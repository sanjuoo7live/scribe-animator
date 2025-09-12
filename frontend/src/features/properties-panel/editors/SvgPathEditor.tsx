import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../store/appStore';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { FEATURE_FLAGS } from '../domain/flags';
import { patchSceneObject } from '../domain/patch';
import PROPERTY_RANGES from '../domain/constants';
import { clampNumber } from '../validation';
import useThrottledCallback from '../hooks/useThrottledCallback';
import { HandFollowerCalibrationModalLazy } from '../../../components/hands/lazy';
import { saveCalibration } from '../../../utils/calibrationService';
import HandToolSelector from '../../../components/hands/HandToolSelector';
import { HAND_ASSETS, TOOL_ASSETS } from '../../../types/handAssets';

const SvgPathEditorComponent: React.FC = () => {
  const [id, handFollower] = (useAppStore as any)(
    useShallow((state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      if (!obj || obj.type !== 'svgPath')
        return ['', null] as const;
      return [
        obj.id,
        (obj.properties?.handFollower ?? null),
      ] as const;
    })
  ) as [string, any | null];

  const hf = handFollower || ({} as any);
  const [calibrateOpen, setCalibrateOpen] = React.useState(false);
  const [selectorOpen, setSelectorOpen] = React.useState(false);

  const handleToggle = React.useCallback(
    (key: 'enabled' | 'mirror') => () => {
      if (!id) return;
      patchSceneObject(id, {
        properties: {
          handFollower: { ...hf, [key]: !hf[key] },
        },
      });
    },
    [id, hf]
  );

  const patchScale = useThrottledCallback(
    (val: number) => {
      if (id) {
        patchSceneObject(id, {
          properties: { handFollower: { ...hf, scale: val } },
        });
      }
    },
    80,
    [id, hf]
  );

  const handleScale = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = clampNumber(
        Number(e.target.value),
        PROPERTY_RANGES.handScale.min,
        PROPERTY_RANGES.handScale.max ?? Infinity
      );
      patchScale(val);
    },
    [patchScale]
  );

  const handleSmoothing = React.useCallback(() => {
    if (!id) return;
    const smoothing = hf.smoothing || { enabled: false };
    patchSceneObject(id, {
      properties: {
        handFollower: {
          ...hf,
          smoothing: { ...smoothing, enabled: !smoothing.enabled },
        },
      },
    });
  }, [id, hf]);

  const handleCornerLifts = React.useCallback(() => {
    if (!id) return;
    const corner = hf.cornerLifts || { enabled: false };
    patchSceneObject(id, {
      properties: {
        handFollower: {
          ...hf,
          cornerLifts: { ...corner, enabled: !corner.enabled },
        },
      },
    });
  }, [id, hf]);

  // Offsets are now edited exclusively inside the Calibration modal

  if (!id) return null;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={!!hf.enabled}
          onChange={handleToggle('enabled')}
          aria-label="Show hand following path"
        />
        Show hand following path
      </label>
      {hf.enabled && (
        <div className="pl-4 space-y-2">
          {/* Hand & Tool picker (legacy UX) */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hand & Tool</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectorOpen(true)}
                className="flex-1 p-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 text-left"
              >
                {hf?.handAsset?.name && hf?.toolAsset?.name
                  ? `${hf.handAsset.name} + ${hf.toolAsset.name}`
                  : 'Choose hand + tool'}
              </button>
              <button
                onClick={() => {
                  patchSceneObject(id, {
                    properties: { handFollower: { ...hf, handAsset: null, toolAsset: null } },
                  });
                }}
                className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                title="Remove hand asset"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Custom PNG uploads available!</p>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!hf.mirror}
              onChange={handleToggle('mirror')}
              aria-label="Mirror Left/Right"
            />
            Mirror Left/Right
          </label>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hand Scale</label>
            <input
              type="range"
              min={PROPERTY_RANGES.handScale.min}
              max={PROPERTY_RANGES.handScale.max}
              step={PROPERTY_RANGES.handScale.step}
              value={hf.scale ?? PROPERTY_RANGES.handScale.default}
              onChange={handleScale}
            />
          </div>
          {/* Offsets moved into Calibration modal */}

          {/* Advanced Calibration */}
          <div className="mt-1">
            <div className="text-xs text-gray-400 mb-1">Advanced Calibration</div>
            <button
              className="w-full text-sm px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
              onClick={() => setCalibrateOpen(true)}
            >
              🎯 Open Calibration Tool
            </button>
            <div className="text-[11px] text-gray-400 mt-1">
              Fine-tune nib position, backtrack, and alignment
            </div>
          </div>

          {/* Movement Smoothing */}
          <div className="mt-2">
            <div className="text-[11px] text-emerald-300 mb-1">NEW</div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!hf.smoothing?.enabled}
                onChange={handleSmoothing}
                aria-label="Enable smooth movement"
              />
              Enable smooth movement
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!hf.cornerLifts?.enabled}
              onChange={handleCornerLifts}
              aria-label="Lift hand at sharp corners"
            />
            Lift hand at sharp corners
          </label>
        </div>
      )}
      <React.Suspense fallback={null}>
        {calibrateOpen && (
          <HandFollowerCalibrationModalLazy
            isOpen={calibrateOpen}
            onClose={() => setCalibrateOpen(false)}
            handAsset={hf?.handAsset || HAND_ASSETS[0]}
            toolAsset={hf?.toolAsset || TOOL_ASSETS[0]}
            initialSettings={{
              tipBacktrackPx: hf?.tipBacktrackPx ?? 0,
              calibrationOffset: hf?.calibrationOffset || hf?.offset || { x: 0, y: 0 },
              nibAnchor: hf?.nibAnchor || undefined,
              mirror: !!hf?.mirror,
              showForeground: hf?.showForeground !== false,
              toolRotationOffsetDeg: hf?.toolRotationOffsetDeg ?? 0,
              baseScale: hf?.scale ?? PROPERTY_RANGES.handScale.default,
              nibLock: hf?.nibLock !== false,
            }}
            onLiveChange={(partial: any) => {
              if (!id) return;
              const nextHF = { ...hf } as any;
              if (partial.tipBacktrackPx !== undefined) nextHF.tipBacktrackPx = partial.tipBacktrackPx;
              if (partial.calibrationOffset) {
                nextHF.calibrationOffset = partial.calibrationOffset;
                nextHF.offset = partial.calibrationOffset; // keep in sync with offset used elsewhere
              }
              if (partial.extraOffset) {
                nextHF.calibrationOffset = partial.extraOffset;
                nextHF.offset = partial.extraOffset;
              }
              if (partial.nibAnchor) nextHF.nibAnchor = partial.nibAnchor;
              if (partial.nibLock !== undefined) nextHF.nibLock = !!partial.nibLock;
              if (partial.mirror !== undefined) nextHF.mirror = !!partial.mirror;
              if (partial.toolRotationOffsetDeg !== undefined) nextHF.toolRotationOffsetDeg = partial.toolRotationOffsetDeg;
              patchSceneObject(id, { properties: { handFollower: nextHF } });
            }}
            onApply={async (settings: any) => {
              if (!id) return;
              const nextHF = { ...hf } as any;
              nextHF.tipBacktrackPx = settings.tipBacktrackPx;
              nextHF.calibrationOffset = settings.calibrationOffset;
              nextHF.offset = settings.calibrationOffset;
              nextHF.nibAnchor = settings.nibAnchor;
              nextHF.toolRotationOffsetDeg = settings.toolRotationOffsetDeg;
              if (typeof settings.calibrationBaseScale === 'number') nextHF.calibrationBaseScale = settings.calibrationBaseScale;
              if (typeof settings.nibLock === 'boolean') nextHF.nibLock = !!settings.nibLock;
              patchSceneObject(id, { properties: { handFollower: nextHF } });
              // Persist to backend if we have concrete hand/tool ids
              try {
                const handId = nextHF?.handAsset?.id;
                const toolId = nextHF?.toolAsset?.id;
                if (handId && toolId) {
                  await saveCalibration(handId, toolId, settings);
                }
              } catch {}
            }}
          />
        )}
      </React.Suspense>

      {/* Hand/Tool selector modal */}
      {selectorOpen && (
        <HandToolSelector
          open={selectorOpen}
          initialHand={hf?.handAsset || null}
          initialTool={hf?.toolAsset || null}
          initialScale={hf?.scale ?? PROPERTY_RANGES.handScale.default}
          onApply={({ hand, tool, scale, mirror, calibrated }) => {
            patchSceneObject(id, {
              properties: {
                handFollower: {
                  ...hf,
                  enabled: true,
                  handAsset: hand,
                  toolAsset: tool,
                  scale,
                  mirror: !!mirror,
                  // Apply saved calibration defaults if available
                  ...(calibrated?.nibAnchor ? { nibAnchor: calibrated.nibAnchor } : {}),
                  ...(calibrated?.calibrationOffset ? { calibrationOffset: calibrated.calibrationOffset, offset: calibrated.calibrationOffset } : {}),
                  ...(typeof calibrated?.tipBacktrackPx === 'number' ? { tipBacktrackPx: calibrated.tipBacktrackPx } : {}),
                  ...(typeof calibrated?.toolRotationOffsetDeg === 'number' ? { toolRotationOffsetDeg: calibrated.toolRotationOffsetDeg } : {}),
                },
              },
            });
            setSelectorOpen(false);
          }}
          onClose={() => setSelectorOpen(false)}
        />
      )}
    </div>
  );
};

export const SvgPathEditor = React.memo(SvgPathEditorComponent);
