import React from 'react';
import { render } from '@testing-library/react';
import { SvgPathRenderer } from '../renderers/SvgPathRenderer';
import { PathSampler } from '../../../utils/pathSampler';

// Use shared Konva mocks that sanitize props
jest.mock('react-konva', () => require('../../../testUtils/reactKonvaMock').default);

test('uses provided samples and len when available', () => {
  const samples = [
    { x: 0, y: 0, cumulativeLength: 0 },
    { x: 10, y: 0, cumulativeLength: 10 }
  ];
  const obj = {
    id: 'v1',
    type: 'svgPath',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    properties: { paths: [{ d: 'M0 0 L10 0', len: 10, samples }], totalLen: 10 },
    animationStart: 0,
    animationDuration: 1,
    animationType: 'none',
    animationEasing: 'linear'
  } as any;

  const spy = jest.spyOn(PathSampler, 'samplePath');
  render(
    <SvgPathRenderer
      obj={obj}
      animatedProps={{}}
      currentTime={0}
      isSelected={false}
      tool="select"
      onClick={() => {}}
      onDragEnd={() => {}}
      onDragMove={() => {}}
      onTransformEnd={() => {}}
    />
  );
  expect(spy).not.toHaveBeenCalled();
});
