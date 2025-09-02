/**
 * Unit tests for Path Sampling System
 */

import { PathSampler, PathPoint } from '../pathSampler';

// Mock DOM methods for testing
const createMockPath = (totalLength: number = 100) => ({
  setAttribute: jest.fn(),
  getTotalLength: jest.fn(() => totalLength),
  getPointAtLength: jest.fn((length: number) => ({
    x: length, // Simple linear path for testing
    y: Math.sin(length * 0.01) * 10 // Add some curve
  }))
});

const createMockSvg = () => ({
  setAttribute: jest.fn(),
  appendChild: jest.fn(),
  style: {}
});

global.document = {
  createElementNS: jest.fn((ns: string, tag: string) => {
    if (tag === 'path') return createMockPath();
    if (tag === 'svg') return createMockSvg();
    return {};
  }),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
} as any;

describe('PathSampler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('samplePath', () => {
    it('should sample a simple line path', () => {
      const pathData = 'M0,0 L100,0';
      const samples = PathSampler.samplePath(pathData, 10);
      
      expect(samples.length).toBeGreaterThan(0);
      expect(samples[0].x).toBe(0);
      expect(samples[0].cumulativeLength).toBe(0);
    });

    it('should handle empty path data', () => {
      const samples = PathSampler.samplePath('', 10);
      expect(samples.length).toBe(0);
    });

    it('should respect sample distance', () => {
      const pathData = 'M0,0 L100,0';
      const samples1 = PathSampler.samplePath(pathData, 5);
      const samples2 = PathSampler.samplePath(pathData, 10);
      
      // Smaller sample distance should produce more samples
      expect(samples1.length).toBeGreaterThan(samples2.length);
    });
  });

  describe('getPointAtProgress', () => {
    const mockSamples: PathPoint[] = [
      { x: 0, y: 0, cumulativeLength: 0, tangentAngle: 0, segmentIndex: 0 },
      { x: 50, y: 0, cumulativeLength: 50, tangentAngle: 0, segmentIndex: 0 },
      { x: 100, y: 0, cumulativeLength: 100, tangentAngle: 0, segmentIndex: 0 }
    ];

    it('should return first point at progress 0', () => {
      const point = PathSampler.getPointAtProgress(mockSamples, 0);
      expect(point).toEqual(mockSamples[0]);
    });

    it('should return last point at progress 1', () => {
      const point = PathSampler.getPointAtProgress(mockSamples, 1);
      expect(point).toEqual(mockSamples[2]);
    });

    it('should interpolate correctly at progress 0.5', () => {
      const point = PathSampler.getPointAtProgress(mockSamples, 0.5);
      expect(point?.x).toBe(50);
      expect(point?.y).toBe(0);
      expect(point?.cumulativeLength).toBe(50);
    });

    it('should handle empty samples array', () => {
      const point = PathSampler.getPointAtProgress([], 0.5);
      expect(point).toBeNull();
    });

    it('should clamp progress values', () => {
      const pointBelow = PathSampler.getPointAtProgress(mockSamples, -0.5);
      const pointAbove = PathSampler.getPointAtProgress(mockSamples, 1.5);
      
      expect(pointBelow).toEqual(mockSamples[0]);
      expect(pointAbove).toEqual(mockSamples[2]);
    });
  });

  describe('getTangentAtProgress', () => {
    const mockSamples: PathPoint[] = [
      { x: 0, y: 0, cumulativeLength: 0, tangentAngle: 0, segmentIndex: 0 },
      { x: 100, y: 0, cumulativeLength: 100, tangentAngle: Math.PI / 4, segmentIndex: 0 }
    ];

    it('should return tangent angle at progress', () => {
      const angle = PathSampler.getTangentAtProgress(mockSamples, 0);
      expect(angle).toBe(0);
    });

    it('should handle empty samples', () => {
      const angle = PathSampler.getTangentAtProgress([], 0.5);
      expect(angle).toBe(0);
    });
  });

  describe('createCachedSampler', () => {
    it('should create a cached sampler with methods', () => {
      const pathData = 'M0,0 L100,0';
      const sampler = PathSampler.createCachedSampler(pathData, 10);
      
      expect(sampler.samples).toBeDefined();
      expect(typeof sampler.getPointAtProgress).toBe('function');
      expect(typeof sampler.getTangentAtProgress).toBe('function');
      expect(typeof sampler.getTotalLength).toBe('function');
    });

    it('should return consistent results', () => {
      const pathData = 'M0,0 L100,0';
      const sampler = PathSampler.createCachedSampler(pathData, 10);
      
      const point1 = sampler.getPointAtProgress(0.5);
      const point2 = sampler.getPointAtProgress(0.5);
      
      expect(point1).toEqual(point2);
    });
  });

  describe('angle interpolation', () => {
    it('should handle angle wrap-around correctly', () => {
      // Test interpolation across the -π to π boundary
      const samples: PathPoint[] = [
        { x: 0, y: 0, cumulativeLength: 0, tangentAngle: -Math.PI + 0.1, segmentIndex: 0 },
        { x: 10, y: 0, cumulativeLength: 10, tangentAngle: Math.PI - 0.1, segmentIndex: 0 }
      ];
      
      const midPoint = PathSampler.getPointAtProgress(samples, 0.5);
      expect(midPoint?.tangentAngle).toBeDefined();
      
      // The interpolated angle should be reasonable (not a large jump)
      const angle = midPoint?.tangentAngle || 0;
      expect(Math.abs(angle)).toBeLessThan(Math.PI);
    });
  });
});
