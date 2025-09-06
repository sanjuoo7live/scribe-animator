// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock worker-based SVG importer to avoid import.meta URL in Jest
jest.mock('./features/svg-import/infra/workerClient', () => ({
  runImportInWorker: jest.fn((_svg: string, _opts: any, _onProgress: any) =>
    Promise.reject(new Error('workerClient mocked in tests'))
  ),
}));
