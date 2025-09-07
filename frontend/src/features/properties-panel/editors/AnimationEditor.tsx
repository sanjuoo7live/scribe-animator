import React from 'react';
import { shallow } from 'zustand/shallow';
import { useAppStore } from '../../../store/appStore';
import PROPERTY_RANGES from '../domain/constants';
import { clampNumber } from '../validation';
import { patchSceneObject } from '../domain/patch';

const types = ['none', 'fadeIn', 'slideIn', 'scaleIn', 'drawIn', 'pathFollow', 'typewriter'];
const easings = ['linear', 'easeIn', 'easeOut', 'easeInOut'];

const AnimationEditorComponent: React.FC = () => {
  const { id, start, duration, type, easing } = (useAppStore as any)(
    (state: any) => {
      const obj = state.currentProject?.objects.find(
        (o: any) => o.id === state.selectedObject
      );
      if (!obj)
        return {
          id: '',
          start: PROPERTY_RANGES.animationStart.default,
          duration: PROPERTY_RANGES.animationDuration.default,
          type: 'none',
          easing: 'linear',
        };
      return {
        id: obj.id,
        start: obj.animationStart ?? PROPERTY_RANGES.animationStart.default,
        duration: obj.animationDuration ?? PROPERTY_RANGES.animationDuration.default,
        type: obj.animationType ?? 'none',
        easing: obj.animationEasing ?? 'linear',
      };
    },
    shallow
  ) as {
    id: string;
    start: number;
    duration: number;
    type: string;
    easing: string;
  };

  const [startLocal, setStartLocal] = React.useState(String(start));
  const [durationLocal, setDurationLocal] = React.useState(String(duration));
  React.useEffect(() => setStartLocal(String(start)), [start]);
  React.useEffect(() => setDurationLocal(String(duration)), [duration]);

  const commitStart = React.useCallback(() => {
    const val = clampNumber(
      Number(startLocal),
      PROPERTY_RANGES.animationStart.min,
      PROPERTY_RANGES.animationStart.max ?? Infinity
    );
    if (id) patchSceneObject(id, { animationStart: val });
  }, [id, startLocal]);

  const commitDuration = React.useCallback(() => {
    const val = clampNumber(
      Number(durationLocal),
      PROPERTY_RANGES.animationDuration.min,
      PROPERTY_RANGES.animationDuration.max ?? Infinity
    );
    if (id) patchSceneObject(id, { animationDuration: val });
  }, [id, durationLocal]);

  const handleStartChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setStartLocal(e.target.value),
    []
  );

  const handleDurationChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDurationLocal(e.target.value),
    []
  );

  const handleType = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value as any;
      if (id) patchSceneObject(id, { animationType: val });
    },
    [id]
  );

  const handleEasing = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value as any;
      if (id) patchSceneObject(id, { animationEasing: val });
    },
    [id]
  );

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-400 mb-2">Animation</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Start Time (seconds)</label>
          <input
            type="number"
            value={startLocal}
            onChange={handleStartChange}
            onBlur={commitStart}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitStart();
              }
            }}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Duration (seconds)</label>
          <input
            type="number"
            value={durationLocal}
            onChange={handleDurationChange}
            onBlur={commitDuration}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitDuration();
              }
            }}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Animation Type</label>
          <select
            value={type}
            onChange={handleType}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Easing</label>
          <select
            value={easing}
            onChange={handleEasing}
            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
          >
            {easings.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export const AnimationEditor = React.memo(AnimationEditorComponent);
