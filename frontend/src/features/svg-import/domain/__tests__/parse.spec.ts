import { parse } from '../parse';

test('parses length units to pixels', () => {
  const svg = '<svg width="10mm" height="20mm" viewBox="0 0 100 200"></svg>';
  const res = parse(svg, 1);
  expect(res.width).toBeCloseTo(37.795, 3);
  expect(res.height).toBeCloseTo(75.59, 2);
  expect(res.viewBox).toEqual([0,0,100,200]);
});
