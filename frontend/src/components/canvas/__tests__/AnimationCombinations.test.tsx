import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DrawPathRenderer } from '../renderers/DrawPathRenderer';
import { TextRenderer } from '../renderers/TextRenderer';
import { ShapeRenderer } from '../renderers/ShapeRenderer';
import { SvgPathRenderer } from '../renderers/SvgPathRenderer';
import { ImageRenderer } from '../renderers/ImageRenderer';

// Mock Konva components
jest.mock('react-konva', () => ({
  Group: ({ children, ...props }: any) => <div data-testid="konva-group" {...props}>{children}</div>,
  Line: ({ children, ...props }: any) => <div data-testid="konva-line" {...props}>{children}</div>,
  Rect: ({ children, ...props }: any) => <div data-testid="konva-rect" {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <div data-testid="konva-text" {...props}>{children}</div>,
  Circle: ({ children, ...props }: any) => <div data-testid="konva-circle" {...props}>{children}</div>,
  Image: ({ children, ...props }: any) => <div data-testid="konva-image" {...props}>{children}</div>,
  Star: ({ children, ...props }: any) => <div data-testid="konva-star" {...props}>{children}</div>,
  RegularPolygon: ({ children, ...props }: any) => <div data-testid="konva-polygon" {...props}>{children}</div>,
  Arrow: ({ children, ...props }: any) => <div data-testid="konva-arrow" {...props}>{children}</div>,
  Shape: ({ children, ...props }: any) => <div data-testid="konva-shape" {...props}>{children}</div>,
}));

// Mock the store
const mockUseAppStore = jest.fn();
jest.doMock('../../../store/appStore', () => ({
  useAppStore: mockUseAppStore,
}));

describe('Animation Type and Easing Combinations', () => {
  const mockStore = {
    currentTime: 0,
    addObject: jest.fn(),
    updateObject: jest.fn(),
    removeObject: jest.fn(),
    selectObject: jest.fn(),
  };

  const animationTypes = [
    'none',
    'fadeIn',
    'slideIn',
    'scaleIn',
    'drawIn',
    'pathFollow',
    'typewriter'
  ] as const;

  const easingTypes = [
    'linear',
    'easeIn',
    'easeOut',
    'easeInOut'
  ] as const;

  const baseProps = {
    animatedProps: {},
    currentTime: 1, // Mid-animation
    isSelected: false,
    tool: 'select' as const,
    onClick: jest.fn(),
    onDragEnd: jest.fn(),
    onTransformEnd: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppStore.mockReturnValue(mockStore);
  });

  describe('DrawPathRenderer - All Animation Types', () => {
    const drawPathBase = {
      id: 'drawpath-test',
      type: 'drawPath' as const,
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      properties: {
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 100 },
          { x: 150, y: 150 }
        ],
        strokeColor: '#000000',
        strokeWidth: 2,
        opacity: 1
      },
      animationStart: 0,
      animationDuration: 2,
    };

    animationTypes.forEach(animationType => {
      easingTypes.forEach(easing => {
        it(`should handle ${animationType} animation with ${easing} easing`, () => {
          const props = {
            ...baseProps,
            obj: {
              ...drawPathBase,
              animationType,
              animationEasing: easing,
            },
          };

          expect(() => render(<DrawPathRenderer {...props} />)).not.toThrow();
          expect(screen.getByTestId('konva-group')).toBeInTheDocument();
        });
      });
    });

    // Test specific animation behaviors
    it('should render lines for drawIn animation', () => {
      const props = {
        ...baseProps,
        obj: {
          ...drawPathBase,
          animationType: 'drawIn' as const,
          animationEasing: 'easeOut' as const,
        },
      };

      render(<DrawPathRenderer {...props} />);
      expect(screen.getByTestId('konva-line')).toBeInTheDocument();
    });

    it('should handle pathFollow animation with path points', () => {
      const props = {
        ...baseProps,
        obj: {
          ...drawPathBase,
          animationType: 'pathFollow' as const,
          properties: {
            ...drawPathBase.properties,
            pathPoints: [
              { x: 0, y: 0 },
              { x: 100, y: 50 },
              { x: 200, y: 100 }
            ],
            rotateWithPath: true,
          },
        },
      };

      expect(() => render(<DrawPathRenderer {...props} />)).not.toThrow();
    });
  });

  describe('TextRenderer - All Animation Types', () => {
    const textBase = {
      id: 'text-test',
      type: 'text' as const,
      x: 100,
      y: 200,
      width: 150,
      height: 50,
      rotation: 0,
      properties: {
        text: 'Hello Animation World',
        fontSize: 24,
        fill: '#000000',
        fontFamily: 'Arial',
      },
      animationStart: 0,
      animationDuration: 2,
    };

    animationTypes.forEach(animationType => {
      easingTypes.forEach(easing => {
        it(`should handle ${animationType} animation with ${easing} easing`, () => {
          const props = {
            ...baseProps,
            obj: {
              ...textBase,
              animationType,
              animationEasing: easing,
            },
          };

          expect(() => render(<TextRenderer {...props} />)).not.toThrow();
          expect(screen.getByTestId('konva-text')).toBeInTheDocument();
        });
      });
    });

    // Test typewriter specific behavior
    it('should show partial text for typewriter animation', () => {
      const props = {
        ...baseProps,
        obj: {
          ...textBase,
          animationType: 'typewriter' as const,
          animationEasing: 'linear' as const,
        },
      };

      render(<TextRenderer {...props} />);
      const textElement = screen.getByTestId('konva-text');

      // Should show partial text (not full text)
      expect(textElement).toHaveAttribute('text');
      expect(textElement.getAttribute('text')).not.toBe('Hello Animation World');
      expect(textElement.getAttribute('text')).toBe('Hello Anim'); // ~45% of text
    });

    it('should show full text when typewriter animation completes', () => {
      const props = {
        ...baseProps,
        currentTime: 3, // Past animation duration
        obj: {
          ...textBase,
          animationType: 'typewriter' as const,
          animationEasing: 'linear' as const,
        },
      };

      render(<TextRenderer {...props} />);
      const textElement = screen.getByTestId('konva-text');

      // Should show full text
      expect(textElement).toHaveAttribute('text', 'Hello Animation World');
    });
  });

  describe('ShapeRenderer - All Animation Types', () => {
    const shapeBase = {
      id: 'shape-test',
      type: 'shape' as const,
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      rotation: 0,
      properties: {
        shapeType: 'rectangle',
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
      },
      animationStart: 0,
      animationDuration: 2,
    };

    const shapeTypes = ['rectangle', 'circle', 'star', 'polygon', 'arrow', 'line'] as const;

    shapeTypes.forEach(shapeType => {
      animationTypes.forEach(animationType => {
        easingTypes.forEach(easing => {
          it(`should handle ${shapeType} with ${animationType} animation and ${easing} easing`, () => {
            const props = {
              ...baseProps,
              obj: {
                ...shapeBase,
                properties: {
                  ...shapeBase.properties,
                  shapeType,
                },
                animationType,
                animationEasing: easing,
              },
            };

            expect(() => render(<ShapeRenderer {...props} />)).not.toThrow();
          });
        });
      });
    });

    // Test specific shape animations
    it('should apply scale animation to rectangle', () => {
      const props = {
        ...baseProps,
        obj: {
          ...shapeBase,
          animationType: 'scaleIn' as const,
          animationEasing: 'easeOut' as const,
        },
      };

      render(<ShapeRenderer {...props} />);
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    it('should apply fade animation to circle', () => {
      const props = {
        ...baseProps,
        obj: {
          ...shapeBase,
          properties: {
            ...shapeBase.properties,
            shapeType: 'circle' as const,
          },
          animationType: 'fadeIn' as const,
          animationEasing: 'easeIn' as const,
        },
      };

      render(<ShapeRenderer {...props} />);
      expect(screen.getByTestId('konva-group')).toBeInTheDocument();
    });
  });

  describe('SvgPathRenderer - All Animation Types', () => {
    const svgPathBase = {
      id: 'svgpath-test',
      type: 'svgPath' as const,
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      properties: {
        paths: [{
          d: 'M10 10 L90 10 L90 90 L10 90 Z',
          len: 320,
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2,
        }],
        totalLen: 320,
      },
      animationStart: 0,
      animationDuration: 2,
    };

    animationTypes.forEach(animationType => {
      easingTypes.forEach(easing => {
        it(`should handle ${animationType} animation with ${easing} easing`, () => {
          const props = {
            ...baseProps,
            obj: {
              ...svgPathBase,
              animationType,
              animationEasing: easing,
            },
          };

          expect(() => render(<SvgPathRenderer {...props} />)).not.toThrow();
          expect(screen.getByTestId('konva-group')).toBeInTheDocument();
        });
      });
    });

    // Test that SVG objects use drawIn animation for hand drawing effect
    it('should apply drawIn animation for SVG objects (hand drawing effect)', () => {
      const props = {
        ...baseProps,
        obj: {
          ...svgPathBase,
          animationType: 'drawIn' as const,
          animationEasing: 'linear' as const,
        },
      };

      render(<SvgPathRenderer {...props} />);
      expect(screen.getByTestId('konva-shape')).toBeInTheDocument();
    });
  });

  describe('ImageRenderer - All Animation Types', () => {
    const imageBase = {
      id: 'image-test',
      type: 'image' as const,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      properties: {
        src: 'https://example.com/image.png',
        alt: 'Test Image',
      },
      animationStart: 0,
      animationDuration: 2,
    };

    animationTypes.forEach(animationType => {
      easingTypes.forEach(easing => {
        it(`should handle ${animationType} animation with ${easing} easing`, () => {
          const props = {
            ...baseProps,
            obj: {
              ...imageBase,
              animationType,
              animationEasing: easing,
            },
          };

          expect(() => render(<ImageRenderer {...props} />)).not.toThrow();
        });
      });
    });
  });

  describe('Animation Progress and Timing', () => {
    it('should handle animation start time offset', () => {
      const props = {
        ...baseProps,
        currentTime: 0.5, // Before animation starts
        obj: {
          id: 'timing-test',
          type: 'text' as const,
          x: 100,
          y: 200,
          width: 150,
          height: 50,
          rotation: 0,
          properties: {
            text: 'Test',
            fontSize: 24,
            fill: '#000000',
            fontFamily: 'Arial',
          },
          animationStart: 1, // Starts at 1 second
          animationDuration: 2,
          animationType: 'fadeIn' as const,
          animationEasing: 'easeOut' as const,
        },
      };

      expect(() => render(<TextRenderer {...props} />)).not.toThrow();
    });

    it('should handle zero duration animations', () => {
      const props = {
        ...baseProps,
        obj: {
          id: 'zero-duration-test',
          type: 'shape' as const,
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          rotation: 0,
          properties: {
            shapeType: 'rectangle',
            fill: '#ff0000',
            stroke: '#000000',
            strokeWidth: 2,
          },
          animationStart: 0,
          animationDuration: 0, // Zero duration
          animationType: 'scaleIn' as const,
          animationEasing: 'linear' as const,
        },
      };

      expect(() => render(<ShapeRenderer {...props} />)).not.toThrow();
    });

    it('should handle negative animation start time', () => {
      const props = {
        ...baseProps,
        currentTime: 2,
        obj: {
          id: 'negative-start-test',
          type: 'drawPath' as const,
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          rotation: 0,
          properties: {
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 50 },
              { x: 100, y: 100 }
            ],
            strokeColor: '#000000',
            strokeWidth: 2,
            opacity: 1
          },
          animationStart: -1, // Negative start time
          animationDuration: 2,
          animationType: 'drawIn' as const,
          animationEasing: 'easeOut' as const,
        },
      };

      expect(() => render(<DrawPathRenderer {...props} />)).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty text gracefully', () => {
      const props = {
        ...baseProps,
        obj: {
          id: 'empty-text-test',
          type: 'text' as const,
          x: 100,
          y: 200,
          width: 150,
          height: 50,
          rotation: 0,
          properties: {
            text: '',
            fontSize: 24,
            fill: '#000000',
            fontFamily: 'Arial',
          },
          animationStart: 0,
          animationDuration: 2,
          animationType: 'typewriter' as const,
          animationEasing: 'linear' as const,
        },
      };

      expect(() => render(<TextRenderer {...props} />)).not.toThrow();
    });

    it('should handle empty points array', () => {
      const props = {
        ...baseProps,
        obj: {
          id: 'empty-points-test',
          type: 'drawPath' as const,
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          rotation: 0,
          properties: {
            points: [],
            strokeColor: '#000000',
            strokeWidth: 2,
            opacity: 1
          },
          animationStart: 0,
          animationDuration: 2,
          animationType: 'drawIn' as const,
          animationEasing: 'easeOut' as const,
        },
      };

      expect(() => render(<DrawPathRenderer {...props} />)).not.toThrow();
    });

    it('should handle missing animation properties', () => {
      const props = {
        ...baseProps,
        obj: {
          id: 'missing-props-test',
          type: 'shape' as const,
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          rotation: 0,
          properties: {
            shapeType: 'rectangle',
            fill: '#ff0000',
            stroke: '#000000',
            strokeWidth: 2,
          },
          animationStart: undefined as any,
          animationDuration: undefined as any,
          animationType: undefined as any,
          animationEasing: undefined as any,
        },
      };

      expect(() => render(<ShapeRenderer {...props} />)).not.toThrow();
    });

    it('should handle invalid animation types gracefully', () => {
      const props = {
        ...baseProps,
        obj: {
          id: 'invalid-type-test',
          type: 'text' as const,
          x: 100,
          y: 200,
          width: 150,
          height: 50,
          rotation: 0,
          properties: {
            text: 'Test',
            fontSize: 24,
            fill: '#000000',
            fontFamily: 'Arial',
          },
          animationStart: 0,
          animationDuration: 2,
          animationType: 'invalidType' as any,
          animationEasing: 'linear' as const,
        },
      };

      expect(() => render(<TextRenderer {...props} />)).not.toThrow();
    });

    it('should handle invalid easing types gracefully', () => {
      const props = {
        ...baseProps,
        obj: {
          id: 'invalid-easing-test',
          type: 'shape' as const,
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          rotation: 0,
          properties: {
            shapeType: 'rectangle',
            fill: '#ff0000',
            stroke: '#000000',
            strokeWidth: 2,
          },
          animationStart: 0,
          animationDuration: 2,
          animationType: 'fadeIn' as const,
          animationEasing: 'invalidEasing' as any,
        },
      };

      expect(() => render(<ShapeRenderer {...props} />)).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of points efficiently', () => {
      const largePoints = Array.from({ length: 1000 }, (_, i) => ({
        x: i * 2,
        y: Math.sin(i * 0.1) * 50,
      }));

      const props = {
        ...baseProps,
        obj: {
          id: 'large-points-test',
          type: 'drawPath' as const,
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          rotation: 0,
          properties: {
            points: largePoints,
            strokeColor: '#000000',
            strokeWidth: 2,
            opacity: 1
          },
          animationStart: 0,
          animationDuration: 2,
          animationType: 'drawIn' as const,
          animationEasing: 'easeOut' as const,
        },
      };

      const startTime = performance.now();
      render(<DrawPathRenderer {...props} />);
      const endTime = performance.now();

      expect(screen.getByTestId('konva-group')).toBeInTheDocument();
      expect(endTime - startTime).toBeLessThan(100); // Should render within 100ms
    });

    it('should handle multiple simultaneous animations', () => {
      const objects = Array.from({ length: 10 }, (_, i) => ({
        ...baseProps,
        obj: {
          id: `multi-test-${i}`,
          type: 'shape' as const,
          x: i * 50,
          y: i * 30,
          width: 100,
          height: 100,
          rotation: 0,
          properties: {
            shapeType: 'rectangle',
            fill: '#ff0000',
            stroke: '#000000',
            strokeWidth: 2,
          },
          animationStart: 0,
          animationDuration: 2,
          animationType: 'fadeIn' as const,
          animationEasing: 'easeOut' as const,
        },
      }));

      const startTime = performance.now();

      objects.forEach(props => {
        render(<ShapeRenderer {...props} />);
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // Should render 10 objects within 500ms
    });
  });
});
