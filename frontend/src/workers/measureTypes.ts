export type Point = { x: number; y: number };
export type Mat = readonly [number, number, number, number, number, number];
export type MeasureItem = { d: string; m?: Mat };
export type MeasureError = { index: number; message: string };
export type MeasureResult = { lens: number[]; total: number; errors: MeasureError[] };

export type WorkerRequest =
  | { id: number; type: 'measure'; items: MeasureItem[] }
  | { id: number; type: 'abort' };

export type WorkerMessage =
  | { id: number; type: 'progress'; done: number; total: number }
  | { id: number; type: 'result'; lens: number[]; total: number; errors: MeasureError[] }
  | { id: number; type: 'abort' };
