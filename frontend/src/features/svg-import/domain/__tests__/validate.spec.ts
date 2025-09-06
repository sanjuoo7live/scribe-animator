import { validate, pathLength } from '../validate';
import type { ExtractedSvg } from '../extractPaths';
import { parse } from '../parse';
import { extractPaths } from '../extractPaths';

test('enforces maxElements', () => {
  const doc = new DOMParser().parseFromString('<svg><g><rect/><rect/></g></svg>', 'image/svg+xml');
  const flat: ExtractedSvg = { doc, width:0, height:0, viewBox:[0,0,0,0], paths:[], warnings:[] };
  expect(() => validate(flat, { maxElements: 1 })).toThrow(/exceeds maxElements/);
});

test('drops tiny paths and applies length cap', () => {
  const svg = '<svg><path d="M0 0 L1 0 L1 1 L0 1 Z"/><path d="M0 0 L0 2000000"/></svg>';
  const ast = parse(svg);
  const extracted = extractPaths(ast, { skipTinySegmentsPx: 0 });
  const res = validate(extracted, { maxCommandsPerPath: 1000, maxElements: 10 });
  expect(res.paths.length).toBe(1);
});

test('pathLength handles Q and S', () => {
  const q = 'M 0 0 Q 5 10 10 0';
  const s = 'M 0 0 C 0 10 10 10 10 0 S 20 -10 20 0';
  expect(pathLength(q)).toBeGreaterThan(14);
  expect(pathLength(s)).toBeGreaterThan(39);
});
