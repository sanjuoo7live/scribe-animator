import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CanvasEditorRefactored from '../../core/CanvasEditorRefactored';
import { useAppStore } from '../../../store/appStore';

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

// Mock the store (avoid hoisting issues by defining jest.fn inside factory)
jest.mock('../../../store/appStore', () => ({
  useAppStore: jest.fn(),
}));

// Polyfill ResizeObserver for jsdom with a simple class
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = RO as any;
// Mock react-konva to avoid jsdom canvas context issues
jest.mock('react-konva', () => {
  const React = require('react');
  const Stub = ({ children, 'data-testid': testId }: any) => (
    <div data-testid={testId || 'rk-stub'}>{children}</div>
  );
  return {
    Stage: ({ children }: any) => <Stub data-testid="stage">{children}</Stub>,
    Layer: ({ children }: any) => <Stub data-testid="layer">{children}</Stub>,
    Rect: () => <div data-testid="konva-rect" />,
    Transformer: () => <div data-testid="transformer" />,
    Line: () => <div data-testid="konva-line" />,
  };
});

// Polyfill ResizeObserver for jsdom environment
// @ts-ignore
global.ResizeObserver = global.ResizeObserver || jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock child components
jest.mock('../../CanvasSettings', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="canvas-settings">Canvas Settings</div>),
}));

jest.mock('../../CameraControls', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="camera-controls">Camera Controls</div>),
}));

describe('CanvasEditorRefactored', () => {
  const mockStore = {
    currentProject: {
      id: 'project-1',
      name: 'Test Project',
      width: 800,
      height: 600,
      fps: 30,
      duration: 10,
      objects: [],
      boardStyle: 'whiteboard',
      backgroundColor: '#ffffff',
      cameraPosition: { x: 0, y: 0, zoom: 1 },
    },
    selectedObject: null,
    currentTime: 0,
    isPlaying: false,
    addObject: jest.fn(),
    updateObject: jest.fn(),
    removeObject: jest.fn(),
    selectObject: jest.fn(),
    undo: jest.fn(),
    canUndo: jest.fn(() => false),
    redo: jest.fn(),
    canRedo: jest.fn(() => false),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  const mockedUseAppStore = useAppStore as unknown as jest.Mock;
  mockedUseAppStore.mockReturnValue(mockStore);
  });

  it('renders without crashing', () => {
    expect(() => render(<CanvasEditorRefactored />)).not.toThrow();
  });

  it('renders with empty project', () => {
  const mockedUseAppStore = useAppStore as unknown as jest.Mock;
  mockedUseAppStore.mockReturnValue({
  // @ts-ignore
      ...mockStore,
      currentProject: null,
    });

    expect(() => render(<CanvasEditorRefactored />)).not.toThrow();
  });

  it('handles missing camera position', () => {
  const mockedUseAppStore = useAppStore as unknown as jest.Mock;
  mockedUseAppStore.mockReturnValue({
  // @ts-ignore
      ...mockStore,
      currentProject: {
        ...mockStore.currentProject,
        cameraPosition: undefined,
      },
    });

    expect(() => render(<CanvasEditorRefactored />)).not.toThrow();
  });
});
