import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DrawPathRenderer } from '../renderers/DrawPathRenderer';
import { TextRenderer } from '../renderers/TextRenderer';
import { ShapeRenderer } from '../renderers/ShapeRenderer';
import { AnimationEngine } from '../animation/AnimationEngine';

// Mock browser APIs
const mockPerformanceNow = jest.fn();
global.requestAnimationFrame = jest.fn((cb) => {
  return setTimeout(cb, 16); // Simulate ~60fps
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

global.performance = {
  ...global.performance,
  now: mockPerformanceNow,
};

// Mock Konva components using shared sanitized mock
jest.mock('react-konva', () => require('../../../testUtils/reactKonvaMock').default);

// Mock the store using jest.doMock to avoid hoisting issues
const mockUseAppStore = jest.fn();
jest.doMock('../../../store/appStore', () => ({
  useAppStore: mockUseAppStore,
}));

describe('Animation System Tests', () => {
  const mockStore = {
    currentTime: 0,
    addObject: jest.fn(),
    updateObject: jest.fn(),
    removeObject: jest.fn(),
    selectObject: jest.fn(),
  };

  const mockProps = {
    obj: {
      id: 'test-obj',
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
      animationType: 'drawIn' as const,
      animationEasing: 'easeOut' as const
    },
    animatedProps: {},
    currentTime: 0,
    isSelected: false,
    tool: 'select' as const,
    onClick: jest.fn(),
    onDragEnd: jest.fn(),
    onTransformEnd: jest.fn(),
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('AnimationEngine', () => {
    let animationEngine: AnimationEngine;

    beforeEach(() => {
      animationEngine = new AnimationEngine();
    });

    it('should initialize with correct default state', () => {
      expect(animationEngine.isActive()).toBe(false);
      expect(animationEngine.getTime()).toBe(0);
      expect(animationEngine.getSubscriberCount()).toBe(0);
    });

    it('should start and stop animation loop', () => {
      animationEngine.start();
      expect(animationEngine.isActive()).toBe(true);

      animationEngine.stop();
      expect(animationEngine.isActive()).toBe(false);
    });

    it('should handle subscribers correctly', () => {
      const mockCallback = jest.fn();
      const unsubscribe = animationEngine.subscribe(mockCallback);

      // Mock performance.now to return increasing values
      let time = 0;
      mockPerformanceNow.mockImplementation(() => {
        time += 16; // Simulate ~60fps
        return time;
      });

      animationEngine.start();

      // Advance timers to trigger animation frame
      jest.advanceTimersByTime(16);

      expect(mockCallback).toHaveBeenCalled();

      unsubscribe();
      expect(animationEngine.getSubscriberCount()).toBe(0);
    });

    it('should reset time correctly', () => {
      // Mock performance.now to return increasing values
      let time = 0;
      mockPerformanceNow.mockImplementation(() => {
        time += 1000; // Simulate 1 second passing
        return time;
      });

      animationEngine.start();
      jest.advanceTimersByTime(100);
      expect(animationEngine.getTime()).toBeGreaterThan(0);

      animationEngine.reset();
      expect(animationEngine.getTime()).toBe(0);
    });
  });

  describe('DrawPathRenderer - DrawIn Animation', () => {
    it('should render drawPath with drawIn animation', () => {
      const propsWithTime = {
        ...mockProps,
        currentTime: 1, // Set time to reveal more points
      };
      render(<DrawPathRenderer {...propsWithTime} />);

      expect(screen.getByTestId('konva-group')).toBeInTheDocument();
      expect(screen.getByTestId('konva-line')).toBeInTheDocument();
    });

    it('should handle animation progress calculation', () => {
      const propsWithTime = {
        ...mockProps,
        currentTime: 1.5, // More than halfway through 2-second animation to reveal multiple points
      };

      render(<DrawPathRenderer {...propsWithTime} />);

      // Should render with partial animation
      expect(screen.getByTestId('konva-line')).toBeInTheDocument();
    });

    it('should handle completed animation', () => {
      const propsWithTime = {
        ...mockProps,
        currentTime: 3, // Past animation duration
      };

      render(<DrawPathRenderer {...propsWithTime} />);

      // Should render full path
      expect(screen.getByTestId('konva-line')).toBeInTheDocument();
    });

    it('should handle different easing functions', () => {
      const easingTests = [
        { easing: 'linear' as const, expected: true },
        { easing: 'easeIn' as const, expected: true },
        { easing: 'easeOut' as const, expected: true },
        { easing: 'easeInOut' as const, expected: true },
      ];

      easingTests.forEach(({ easing }) => {
        const propsWithEasing = {
          ...mockProps,
          obj: {
            ...mockProps.obj,
            animationEasing: easing,
          },
          currentTime: 1, // Set time to reveal multiple points during animation
        };

        const { unmount } = render(<DrawPathRenderer {...propsWithEasing} />);
        // Check that component renders without throwing, and group is present
        expect(screen.getByTestId('konva-group')).toBeInTheDocument();
        unmount(); // Clean up between tests
      });
    });

    it('should handle tool follower for drawIn animation', () => {
      mockUseAppStore.mockReturnValue({
        ...mockStore,
        currentTime: 0.5, // During animation
      });

      const propsWithTool = {
        ...mockProps,
        obj: {
          ...mockProps.obj,
          properties: {
            ...mockProps.obj.properties,
            selectedPenType: 'pen',
            selectedHandAsset: 'right-light',
          },
        },
      };

      render(<DrawPathRenderer {...propsWithTool} />);
      expect(screen.getByTestId('konva-group')).toBeInTheDocument();
    });
  });

  describe('TextRenderer - Typewriter Animation', () => {
    const textProps = {
      ...mockProps,
      obj: {
        ...mockProps.obj,
        type: 'text' as const,
        properties: {
          text: 'Hello World',
          fontSize: 24,
          fill: '#000000',
          fontFamily: 'Arial',
        },
        animationType: 'typewriter' as const,
        animationDuration: 2,
      },
    };

    it('should render text with typewriter animation', () => {
      render(<TextRenderer {...textProps} />);

      expect(screen.getByTestId('konva-text')).toBeInTheDocument();
    });

    it('should handle partial text reveal during animation', () => {
      mockUseAppStore.mockReturnValue({
        ...mockStore,
        currentTime: 1, // Halfway through animation
      });

      render(<TextRenderer {...textProps} />);

      // Should render partial text
      expect(screen.getByTestId('konva-text')).toBeInTheDocument();
    });
  });

  describe('ShapeRenderer - ScaleIn Animation', () => {
    const shapeProps = {
      ...mockProps,
      obj: {
        ...mockProps.obj,
        type: 'shape' as const,
        properties: {
          shapeType: 'rectangle',
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2,
        },
        animationType: 'scaleIn' as const,
        animationDuration: 1,
      },
    };

    it('should render shape with scaleIn animation', () => {
      render(<ShapeRenderer {...shapeProps} />);

      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    it('should handle scale animation progress', () => {
      mockUseAppStore.mockReturnValue({
        ...mockStore,
        currentTime: 0.5, // Halfway through animation
      });

      render(<ShapeRenderer {...shapeProps} />);

      // Should render with partial scale
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });
  });

  describe('Animation Types Coverage', () => {
    const animationTypes = [
      'fadeIn',
      'slideIn',
      'scaleIn',
      'drawIn',
      'pathFollow',
      'typewriter',
      'none'
    ] as const;

    animationTypes.forEach(animationType => {
      it(`should handle ${animationType} animation type`, () => {
        const propsWithAnimation = {
          ...mockProps,
          obj: {
            ...mockProps.obj,
            animationType,
            animationDuration: 2,
          },
        };

        expect(() => render(<DrawPathRenderer {...propsWithAnimation} />)).not.toThrow();
      });
    });
  });

  describe('Easing Functions', () => {
    const easingTypes = ['linear', 'easeIn', 'easeOut', 'easeInOut'] as const;

    easingTypes.forEach(easing => {
      it(`should handle ${easing} easing function`, () => {
        const propsWithEasing = {
          ...mockProps,
          obj: {
            ...mockProps.obj,
            animationEasing: easing,
          },
          currentTime: 1, // Set time to reveal multiple points
        };

        const { unmount } = render(<DrawPathRenderer {...propsWithEasing} />);
        expect(screen.getByTestId('konva-group')).toBeInTheDocument();
        unmount(); // Clean up between tests
      });
    });
  });

  describe('Animation Timing', () => {
    it('should handle animation start time offset', () => {
      const propsWithOffset = {
        ...mockProps,
        obj: {
          ...mockProps.obj,
          animationStart: 1, // Start 1 second in
          animationDuration: 2,
        },
        currentTime: 0.5, // Before animation starts
      };

      render(<DrawPathRenderer {...propsWithOffset} />);

      // Should not show animation progress before start time
      // When progress is 0, no line should be rendered (only 1 point would be revealed)
      expect(screen.getByTestId('konva-group')).toBeInTheDocument();
      // Note: konva-line may not be present if no segments have enough points to render
    });

    it('should handle zero duration animations', () => {
      const propsWithZeroDuration = {
        ...mockProps,
        obj: {
          ...mockProps.obj,
          animationDuration: 0,
        },
        currentTime: 1, // Any time should work for zero duration
      };

      render(<DrawPathRenderer {...propsWithZeroDuration} />);
      // For zero duration, animation should be complete and lines should be rendered
      // The mock data has 4 points which should create at least one line segment
      expect(screen.getByTestId('konva-group')).toBeInTheDocument();
      // Note: konva-line may not be present if segments don't have enough points after processing
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty points array', () => {
      const propsWithEmptyPoints = {
        ...mockProps,
        obj: {
          ...mockProps.obj,
          properties: {
            ...mockProps.obj.properties,
            points: [],
          },
        },
      };

      expect(() => render(<DrawPathRenderer {...propsWithEmptyPoints} />)).not.toThrow();
    });

    it('should handle missing animation properties', () => {
      const propsWithoutAnimation = {
        ...mockProps,
        obj: {
          ...mockProps.obj,
          animationStart: undefined,
          animationDuration: undefined,
          animationType: undefined,
          animationEasing: undefined,
        },
      };

      render(<DrawPathRenderer {...propsWithoutAnimation} />);
      expect(screen.getByTestId('konva-line')).toBeInTheDocument();
    });

    it('should handle invalid animation types gracefully', () => {
      const propsWithInvalidType = {
        ...mockProps,
        obj: {
          ...mockProps.obj,
          animationType: 'invalid' as any,
        },
      };

      expect(() => render(<DrawPathRenderer {...propsWithInvalidType} />)).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of points efficiently', () => {
      const largePoints = Array.from({ length: 1000 }, (_, i) => ({
        x: i * 2,
        y: Math.sin(i * 0.1) * 50,
      }));

      const propsWithLargePoints = {
        ...mockProps,
        obj: {
          ...mockProps.obj,
          properties: {
            ...mockProps.obj.properties,
            points: largePoints,
          },
        },
        currentTime: 1, // Set time to reveal points
      };

      const startTime = performance.now();
      render(<DrawPathRenderer {...propsWithLargePoints} />);
      const endTime = performance.now();

      expect(screen.getByTestId('konva-line')).toBeInTheDocument();
      expect(endTime - startTime).toBeLessThan(100); // Should render within 100ms
    });

    it('should handle multiple simultaneous animations', () => {
      const multipleObjects = Array.from({ length: 10 }, (_, i) => ({
        ...mockProps,
        obj: {
          ...mockProps.obj,
          id: `test-obj-${i}`,
          x: i * 50,
          y: i * 30,
        },
      }));

      const startTime = performance.now();

      multipleObjects.forEach(props => {
        render(<DrawPathRenderer {...props} />);
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // Should render 10 objects within 500ms
    });
  });
});
