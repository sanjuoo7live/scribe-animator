import React from 'react';
import { render, screen } from '@testing-library/react';
// No store mocking: use real Zustand store

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock the canvas module for Konva
jest.mock('canvas', () => ({
  createCanvas: jest.fn(() => ({
    getContext: jest.fn(() => ({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4)
      })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4)
      })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn()
    })),
    toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
    width: 100,
    height: 100
  })),
  loadImage: jest.fn(() => Promise.resolve({})),
  registerFont: jest.fn()
}), { virtual: true });

// Mock react-konva primitives using shared sanitized mock
jest.mock('react-konva', () => require('./testUtils/reactKonvaMock').default);

// Mock heavy child components to keep this smoke test light
jest.mock('./components/Timeline', () => ({ __esModule: true, default: () => <div data-testid="timeline">Timeline</div> }));
jest.mock('./components/panels/AssetPanel', () => ({ __esModule: true, default: () => <div data-testid="asset-panel">Assets</div> }));
jest.mock('./components/panels/PropertiesPanel', () => ({ __esModule: true, default: () => <div data-testid="properties-panel">Properties</div> }));
jest.mock('./components/shared/ProjectTemplates', () => ({ __esModule: true, default: () => <div data-testid="project-templates">Templates</div> }));
jest.mock('./components/ProjectManager', () => ({ __esModule: true, default: () => <div data-testid="project-manager">Manager</div> }));
jest.mock('./components/ExportSystem', () => ({ __esModule: true, default: () => <div data-testid="export-system">Export</div> }));
jest.mock('./components/AIAssistant', () => ({ __esModule: true, default: () => <div data-testid="ai-assistant">AI</div> }));
jest.mock('./components/CanvasEditorRefactored', () => ({ __esModule: true, default: () => <div data-testid="canvas-editor">Canvas</div> }));

// Removed mocked store values and related configurations

// Import App after mocks are set up
const App = require('./App').default;

test('renders app shell with header and panels', () => {
  render(<App />);
  expect(screen.getByText('Scribe Animator')).toBeInTheDocument();
  expect(screen.getByTestId('asset-panel')).toBeInTheDocument();
  expect(screen.getByTestId('canvas-editor')).toBeInTheDocument();
  expect(screen.getByTestId('timeline')).toBeInTheDocument();
});
