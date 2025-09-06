import { sanitize } from '../sanitize';
import { parse } from '../parse';
import { extractPaths } from '../extractPaths';
import { flatten } from '../flatten';
import { validate } from '../validate';
import { normalize } from '../normalize';

function run(svg: string) {
  const safe = sanitize(svg);
  const ast = parse(safe);
  const extracted = extractPaths(ast, { skipTinySegmentsPx: 0 });
  const flat = flatten(extracted, { skipTinySegmentsPx: 0 });
  const vetted = validate(flat, { skipTinySegmentsPx: 0 });
  return normalize(vetted, { skipTinySegmentsPx: 0 });
}

test('basic line parity', () => {
  const svg = '<svg width="10" height="10" viewBox="0 0 10 10"><path id="a" d="M0 0 L10 0"/></svg>';
  const out = run(svg);
  expect(out).toEqual({
    width: 10,
    height: 10,
    viewBox: [0,0,10,10],
    paths: [{ id: 'a', d: 'M 0 0 L 10 0', fill: 'none', stroke: 'none', strokeWidth: undefined, opacity: undefined, hash: 'fec83085' }],
    warnings: []
  });
});

test('quadratic and smooth cubic parity', () => {
  const svg = '<svg width="20" height="20" viewBox="0 0 20 20"><path id="q" d="M0 0 Q5 10 10 0" stroke="black" stroke-width="2"/><path id="s" d="M0 0 C0 10 10 10 10 0 S20 -10 20 0"/></svg>';
  const out = run(svg);
  expect(out).toEqual({
    width: 20,
    height: 20,
    viewBox: [0,0,20,20],
    paths: [
      { id: 'q', d: 'M 0 0 Q 5 10 10 0', fill: 'none', stroke: '#000000', strokeWidth: 2, opacity: undefined, hash: '8bfcf647' },
      { id: 's', d: 'M 0 0 C 0 10 10 10 10 0 S 20 -10 20 0', fill: 'none', stroke: 'none', strokeWidth: undefined, opacity: undefined, hash: '266fbe5a' }
    ],
    warnings: []
  });
});
