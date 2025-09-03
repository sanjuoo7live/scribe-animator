import { getPath2D, getPathTotalLength, getHandLUT, _clearPathCaches } from '../pathCache';

const SIMPLE_D = 'M0 0 L100 0 L100 100 L0 100 Z';

// Mock DOM and Path2D
const createMockPath = (totalLength: number = 100) => ({
  setAttribute: jest.fn(),
  getTotalLength: jest.fn(() => totalLength),
  getPointAtLength: jest.fn((len: number) => ({ x: len, y: 0 }))
});

const origCreate = document.createElementNS;
const origPath2D = (global as any).Path2D;

beforeAll(() => {
  document.createElementNS = jest.fn(() => createMockPath()) as any;
  (global as any).Path2D = class {
    constructor(public d?: string) {}
  };
});

afterAll(() => {
  document.createElementNS = origCreate;
  (global as any).Path2D = origPath2D;
});

describe('pathCache', () => {
  beforeEach(() => _clearPathCaches());

  it('caches Path2D instances by d', () => {
    const a = getPath2D(SIMPLE_D);
    const b = getPath2D(SIMPLE_D);
    expect(a).toBe(b); // same instance
  });

  it('caches total length by d', () => {
    const a = getPathTotalLength(SIMPLE_D);
    const b = getPathTotalLength(SIMPLE_D);
    expect(a).toBe(b);
  });

  it('builds a hand LUT and reuses it', () => {
    const lut1 = getHandLUT(SIMPLE_D, 2);
    const lut2 = getHandLUT(SIMPLE_D, 2);
    expect(lut1.points.length).toBeGreaterThan(0);
    expect(lut2.points.length).toBeGreaterThan(0);
  });
});
