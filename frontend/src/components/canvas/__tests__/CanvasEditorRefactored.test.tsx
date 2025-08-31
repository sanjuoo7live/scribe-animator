import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CanvasEditorRefactored from '../../CanvasEditorRefactored';

// Mock the store
const mockUseAppStore = jest.fn();
jest.mock('../../../store/appStore', () => ({
  useAppStore: mockUseAppStore,
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
    mockUseAppStore.mockReturnValue(mockStore);
  });

  it('renders without crashing', () => {
    expect(() => render(<CanvasEditorRefactored />)).not.toThrow();
  });

  it('renders with empty project', () => {
    mockUseAppStore.mockReturnValue({
      ...mockStore,
      currentProject: null,
    });

    expect(() => render(<CanvasEditorRefactored />)).not.toThrow();
  });

  it('handles missing camera position', () => {
    mockUseAppStore.mockReturnValue({
      ...mockStore,
      currentProject: {
        ...mockStore.currentProject,
        cameraPosition: undefined,
      },
    });

    expect(() => render(<CanvasEditorRefactored />)).not.toThrow();
  });
});
