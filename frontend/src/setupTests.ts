// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock heavy components that rely on canvas/worker features
jest.mock('./components/shared/SvgDrawSettings', () => () => null);
jest.mock('./components/hands/HandToolSelector', () => () => null);
jest.mock('./components/hands/HandToolCalibrator', () => () => null);
jest.mock('./components/dialogs/HandFollowerCalibrationModal', () => () => null);
jest.mock('./utils/handToolCompositor', () => ({
  HandToolCompositor: { compose: jest.fn(), mirrorHandAsset: jest.fn() }
}));

// Mock worker-based SVG importer to avoid import.meta URL in Jest
jest.mock('./features/svg-import/infra/workerClient', () => ({
  runImportInWorker: jest.fn((_svg: string, _opts: any, _onProgress: any) =>
    Promise.reject(new Error('workerClient mocked in tests'))
  ),
}));
