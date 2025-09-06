/* eslint-disable no-restricted-globals */
import { sanitize } from '../domain/sanitize';
import { parse } from '../domain/parse';
import { extractPaths } from '../domain/extractPaths';
import { flatten } from '../domain/flatten';
import { validate } from '../domain/validate';
import { normalize } from '../domain/normalize';
import type { ImportOptions, ImportedSvg } from '../domain/types';

// Use globalThis to appease eslint in worker context
// eslint-disable-next-line no-restricted-globals
(self as any).onmessage = async (e: MessageEvent) => {
  const { svgText, options }: { svgText: string; options: ImportOptions } = e.data;
  const post = (m: any) => (self as any).postMessage(m);
  try {
    post({ type: 'progress', stage: 'sanitize' });
    const safe = sanitize(svgText);

    post({ type: 'progress', stage: 'parse' });
    const ast = parse(safe, options.unitPx);

    const totalEls = ast.doc.getElementsByTagName('*').length;
    post({ type: 'progress', stage: 'extract', elementsSeen: totalEls });
    const nodes = extractPaths(ast, options);

    post({ type: 'progress', stage: 'flatten', resolvedUses: 0 });
    const flat = flatten(nodes, options);

    post({ type: 'progress', stage: 'validate', paths: flat.paths.length });
    const vetted = validate(flat, options);

    post({ type: 'progress', stage: 'normalize', paths: flat.paths.length });
    const result: ImportedSvg = normalize(vetted, options);

    post({ type: 'done', result });
  } catch (err: any) {
    post({ type: 'error', message: String(err?.message || err) });
  }
};

export {};
