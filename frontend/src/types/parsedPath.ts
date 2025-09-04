// PHASE0: shared ParsedPath type with optional perf fields
export interface ParsedPath {
  d: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillRule?: 'nonzero' | 'evenodd';
  transform?: [number, number, number, number, number, number];
  // Optional precomputed samples/lengths from importer
  samples?: { x: number; y: number; cumulativeLength: number }[] | Float32Array;
  len?: number;
  // Optional lookup table for hand follower
  lut?: { len: number; points: { s: number; x: number; y: number; theta: number }[] };
}
