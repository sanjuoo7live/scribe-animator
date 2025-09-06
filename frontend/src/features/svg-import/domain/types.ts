export type ImportOptions = {
  flattenTransforms?: boolean;
  unitPx?: number;
  maxElements?: number;
  maxCommandsPerPath?: number;
  skipTinySegmentsPx?: number;
};

export type ImportedPath = {
  id?: string;
  d: string;
  fill?: string | 'none';
  stroke?: string | 'none';
  strokeWidth?: number;
  opacity?: number;
  hash: string;
  meta?: Record<string, unknown>;
};

export type ImportedSvg = {
  width: number;
  height: number;
  viewBox: [number, number, number, number];
  paths: ImportedPath[];
  warnings: string[];
};
