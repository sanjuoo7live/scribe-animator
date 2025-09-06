import { parse } from '../parse';
import { extractPaths } from '../extractPaths';

test('transforms arcs with matrix', () => {
  const svg = '<svg><path d="M0 0 A10 10 0 0 0 10 10" transform="scale(2 1) rotate(30)"/></svg>';
  const ast = parse(svg);
  const res = extractPaths(ast, { skipTinySegmentsPx: 0 });
  const d = res.paths[0].d;
  expect(d).not.toMatch(/A/);
  expect(d).toMatch(/C/);
});

test('resolves <use> references and warns on cycles', () => {
  const svg =
    '<svg><defs><path id="p" d="M0 0 L10 0"/></defs><g transform="translate(5 5)"><use href="#p"/></g>' +
    '<use id="a" href="#b"/><use id="b" href="#a"/></svg>';
  const ast = parse(svg);
  const res = extractPaths(ast, { skipTinySegmentsPx: 0 });
  expect(res.paths.length).toBe(1);
  expect(res.paths[0].d).toMatch(/M 5 5/);
  expect(res.warnings.some(w => w.includes('cycle'))).toBe(true);
});
