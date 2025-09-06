export type ParsedSvg = {
  doc: Document;
  width: number;
  height: number;
  viewBox: [number, number, number, number];
};

// Parse raw SVG text into a DOM Document and basic dimension metadata. This step is
// intentionally light; heavy lifting happens in later stages.
const UNIT_RE = /^(-?[\d.]+)([a-z%]*)$/i;
const PX_PER_UNIT: Record<string, number> = {
  '': 1,
  px: 1,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
  pt: 96 / 72,
  pc: 16,
};

function parseLength(value: string | null, unitPx: number): number {
  if (!value) return 0;
  const m = UNIT_RE.exec(value.trim());
  if (!m) throw new Error(`Invalid length: ${value}`);
  const num = parseFloat(m[1]);
  const unit = m[2] || '';
  const ratio = PX_PER_UNIT[unit];
  if (ratio === undefined) throw new Error(`Unsupported unit: ${unit}`);
  return num * ratio * unitPx;
}

export function parse(svg: string, unitPx = 1): ParsedSvg {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgEl = doc.documentElement;

  let width = parseLength(svgEl.getAttribute('width'), unitPx);
  let height = parseLength(svgEl.getAttribute('height'), unitPx);
  let viewBox: [number, number, number, number] = [0, 0, width || 0, height || 0];

  const vbAttr = svgEl.getAttribute('viewBox');
  if (vbAttr) {
    const nums = vbAttr.trim().split(/[\s,]+/).map(Number);
    if (nums.length === 4 && nums.every(n => !Number.isNaN(n))) {
      viewBox = [nums[0], nums[1], nums[2], nums[3]];
      if (!width || !height) { width = nums[2]; height = nums[3]; }
    }
  }
  if (!width || !height) {
    width = parseLength(svgEl.getAttribute('width'), unitPx) || viewBox[2] || 0;
    height = parseLength(svgEl.getAttribute('height'), unitPx) || viewBox[3] || 0;
  }
  return { doc, width, height, viewBox };
}

