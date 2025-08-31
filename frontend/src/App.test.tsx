import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

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

// Mock components that use import.meta.url
jest.mock('./components/SvgImporter', () => ({
  __esModule: true,
  default: () => <div data-testid="svg-importer">SvgImporter Mock</div>
}));

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
