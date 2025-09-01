import React from 'react';

// Sanitize props passed to DOM to avoid React warnings/errors for Konva-specific props
const sanitizeProps = (props: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const key in props) {
    const val = props[key];
    // Always allow accessibility/data hooks and common DOM attrs
    if (
      key === 'children' ||
      key === 'className' ||
      key === 'style' ||
      key === 'id' ||
      key === 'title' ||
      key === 'text' || // used by tests to read Text content
      key.startsWith('data-') ||
      key.startsWith('aria-')
    ) {
      out[key] = val;
      continue;
    }
    // Drop functions (event handlers like onTap, onTransformEnd, etc.)
    if (typeof val === 'function') continue;
    // Drop known Konva-only or invalid DOM props that caused warnings
    const dropList = new Set([
      'scaleX', 'scaleY', 'listening', 'lineCap', 'lineJoin', 'lineHeight',
      'globalCompositeOperation', 'hitStrokeWidth', 'numPoints', 'innerRadius',
      'outerRadius', 'sceneFunc', 'perfectDrawEnabled', '__totalLen', '__targetLen',
      '__dashOffset', 'onDblClick', 'onTap', 'onTransformEnd'
    ]);
    if (dropList.has(key)) continue;
    // By default be conservative: do not pass through unknown props
    // This keeps the DOM clean in tests.
  }
  return out;
};

const makeStub = (testId: string) =>
  ({ children, ...props }: any) => (
    <div data-testid={testId} {...sanitizeProps(props)}>
      {children}
    </div>
  );

export const Stage = makeStub('stage');
export const Layer = makeStub('layer');
export const Group = makeStub('konva-group');
export const Line = makeStub('konva-line');
export const Rect = makeStub('konva-rect');
export const Text = makeStub('konva-text');
export const Circle = makeStub('konva-circle');
export const Image = makeStub('konva-image');
export const Star = makeStub('konva-star');
export const RegularPolygon = makeStub('konva-polygon');
export const Arrow = makeStub('konva-arrow');
export const Shape = makeStub('konva-shape');

const rkDefault = {
  Stage,
  Layer,
  Group,
  Line,
  Rect,
  Text,
  Circle,
  Image,
  Star,
  RegularPolygon,
  Arrow,
  Shape,
};

export default rkDefault;
