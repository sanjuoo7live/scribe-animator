import React from 'react';
import { FEATURE_FLAGS } from '../../features/properties-panel/domain/flags';

export const HandToolSelectorLazy: React.ComponentType<any> =
  FEATURE_FLAGS.calibrators
    ? React.lazy(() => import('./HandToolSelector'))
    : () => null;

export const HandToolCalibratorLazy: React.ComponentType<any> =
  FEATURE_FLAGS.calibrators
    ? React.lazy(() => import('./HandToolCalibrator'))
    : () => null;

export const HandFollowerCalibrationModalLazy: React.ComponentType<any> =
  FEATURE_FLAGS.calibrators
    ? React.lazy(() => import('../dialogs/HandFollowerCalibrationModal'))
    : () => null;
