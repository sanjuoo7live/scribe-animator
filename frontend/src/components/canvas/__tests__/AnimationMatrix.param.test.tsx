import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextRenderer } from '../renderers/TextRenderer';
import { ShapeRenderer } from '../renderers/ShapeRenderer';
import { SvgPathRenderer } from '../renderers/SvgPathRenderer';
import { ImageRenderer } from '../renderers/ImageRenderer';
import { PathFollowerRenderer } from '../renderers/PathFollowerRenderer';

// Use shared Konva mocks that sanitize props
jest.mock('react-konva', () => require('../../../testUtils/reactKonvaMock').default);

const base = {
  animatedProps: {},
  currentTime: 1,
  isSelected: false,
  tool: 'select' as const,
  onClick: jest.fn(),
  onDragEnd: jest.fn(),
  onTransformEnd: jest.fn(),
};

const easings = ['linear','easeIn','easeOut','easeInOut'] as const;

describe('Animation Matrix Coverage (parameterized)', () => {
  describe('Text', () => {
    const textBase = {
      id: 't1', type: 'text' as const, x: 10, y: 10, width: 200, height: 50, rotation: 0,
      properties: { text: 'Hello world', fontSize: 16 }, animationStart: 0, animationDuration: 2,
    };

    const anims = ['none','fadeIn','slideIn','scaleIn','drawIn','pathFollow','typewriter'] as const;
  anims.forEach(a => easings.forEach(e => {
      it(`TextRenderer handles ${a} with ${e}`, () => {
        const props = { ...base, obj: { ...textBase, animationType: a, animationEasing: e } } as any;
        expect(() => render(<TextRenderer {...props} />)).not.toThrow();
        expect(screen.getByTestId('konva-text')).toBeInTheDocument();
      });
    }));
  });

  describe('Shapes', () => {
    const shapeBase = {
      id: 's1', type: 'shape' as const, x: 20, y: 20, width: 100, height: 80, rotation: 0,
      properties: { shapeType: 'rectangle', fill: '#fff', stroke: '#000', strokeWidth: 2 },
      animationStart: 0, animationDuration: 2,
    };
    const anims = ['none','fadeIn','slideIn','scaleIn','drawIn','pathFollow'] as const;
  anims.forEach(a => easings.forEach(e => {
      it(`ShapeRenderer handles ${a} with ${e}`, () => {
        const props = { ...base, obj: { ...shapeBase, animationType: a, animationEasing: e } } as any;
        expect(() => render(<ShapeRenderer {...props} />)).not.toThrow();
        expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
      });
    }));
  });

  describe('SVG Path', () => {
    const svgBase = {
      id: 'v1', type: 'svgPath' as const, x: 0, y: 0, width: 200, height: 200, rotation: 0,
      properties: { paths: [{ d: 'M0 0 L100 0', len: 100, stroke: '#000', strokeWidth: 2 }], totalLen: 100 },
      animationStart: 0, animationDuration: 2,
    };
    it('allows none', () => {
      const props = { ...base, obj: { ...svgBase, animationType: 'none' as const, animationEasing: 'linear' as const } } as any;
      expect(() => render(<SvgPathRenderer {...props} />)).not.toThrow();
      expect(screen.getByTestId('konva-group')).toBeInTheDocument();
    });
    it('allows drawIn with linear only', () => {
      const props = { ...base, obj: { ...svgBase, animationType: 'drawIn' as const, animationEasing: 'linear' as const } } as any;
      expect(() => render(<SvgPathRenderer {...props} />)).not.toThrow();
      expect(screen.getByTestId('konva-group')).toBeInTheDocument();
    });
  });

  describe('Image', () => {
    const imgBase = {
      id: 'i1', type: 'image' as const, x: 30, y: 30, width: 120, height: 90, rotation: 0,
      properties: { src: 'https://example.com/test.png', alt: 'img' }, animationStart: 0, animationDuration: 2,
    };
    const anims = ['none','fadeIn','slideIn','scaleIn'] as const;
  anims.forEach(a => easings.forEach(e => {
      it(`ImageRenderer handles ${a} with ${e}`, () => {
        const props = { ...base, obj: { ...imgBase, animationType: a, animationEasing: e } } as any;
        expect(() => render(<ImageRenderer {...props} />)).not.toThrow();
        // ImageRenderer returns a Group when image loads, or a Text placeholder otherwise
        const el = screen.queryByTestId('konva-group') || screen.queryByTestId('konva-text');
        expect(el).toBeInTheDocument();
      });
    }));
  });

  describe('PathFollower (pathFollow visual)', () => {
    const pfBase = {
      id: 'pf1', type: 'pathFollower' as const, x: 0, y: 0, width: 20, height: 20, rotation: 0,
      properties: {
        pathPoints: [ {x:0,y:0}, {x:50,y:0}, {x:50,y:50} ],
        rotateWithPath: true,
        fill: '#333'
      },
      animationStart: 0, animationDuration: 2,
    };
    easings.forEach(e => {
      it(`PathFollowerRenderer handles pathFollow with ${e}`, () => {
        const props = { ...base, obj: { ...pfBase, animationType: 'pathFollow' as const, animationEasing: e } } as any;
        expect(() => render(<PathFollowerRenderer {...props} />)).not.toThrow();
        expect(screen.getByTestId('konva-group')).toBeInTheDocument();
      });
    });
  });
});
