import type { ImportOptions } from './types';
import type { ExtractedSvg } from './extractPaths';

// Extraction already applies transforms; this stage is a noop retained for parity
// with the original pipeline and future enhancements.
export function flatten(nodes: ExtractedSvg, _options: ImportOptions): ExtractedSvg {
  return nodes;
}

