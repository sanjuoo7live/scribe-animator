import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../store/appStore';
import { FEATURE_FLAGS } from '../domain/flags';
import { patchSceneObject } from '../domain/patch';
import PROPERTY_RANGES from '../domain/constants';
import { clampNumber } from '../validation';
import useThrottledCallback from '../hooks/useThrottledCallback';
import { HandFollowerCalibrationModalLazy } from '../../../components/hands/lazy';
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
          {FEATURE_FLAGS.handSmoothing && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!hf.smoothing?.enabled}
                onChange={handleSmoothing}
                aria-label="Enable smooth movement"
              />
              Enable smooth movement
            </label>
          )}
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={!!hf.cornerLifts?.enabled}
              onChange={handleCornerLifts}
              aria-label="Lift hand at sharp corners"
            />
            Lift hand at sharp corners
          </label>
          {FEATURE_FLAGS.calibrators && (
            <button
              className="text-xs text-blue-300 underline"
              onClick={() => setCalibrateOpen(true)}
            >
              Calibrate Hand
            </button>
          )}
        </div>
      )}
      <React.Suspense fallback={null}>
        {calibrateOpen && (
          <HandFollowerCalibrationModalLazy
            isOpen={calibrateOpen}
            onClose={() => setCalibrateOpen(false)}
            handAsset={HAND_ASSETS[0]}
            toolAsset={TOOL_ASSETS[0]}
          />
        )}
      </React.Suspense>
    </div>
  );
};

export const SvgPathEditor = React.memo(SvgPathEditorComponent);
