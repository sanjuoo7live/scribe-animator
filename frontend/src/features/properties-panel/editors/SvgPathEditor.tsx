import React from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../../../store/appStore';
import { FEATURE_FLAGS } from '../domain/flags';
import { patchSceneObject } from '../domain/patch';

const SvgPathEditorComponent: React.FC = () => {
  const { id, handFollower } = (useAppStore as any)(
    (state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      if (!obj || obj.type !== 'svgPath')
        return { id: '', handFollower: {} as any };
      return {
        id: obj.id,
        handFollower: obj.properties?.handFollower || {},
      };
    },
    shallow
  ) as { id: string; handFollower: any };

  const hf = handFollower || {};

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

  const handleScale = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (id) {
        patchSceneObject(id, {
          properties: { handFollower: { ...hf, scale: val } },
        });
      }
    },
    [id, hf]
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
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">SVG Path</h4>
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
                min={0.5}
                max={2}
                step={0.1}
                value={hf.scale ?? 1}
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
          </div>
        )}
      </div>
    </div>
  );
};

export const SvgPathEditor = React.memo(SvgPathEditorComponent);
