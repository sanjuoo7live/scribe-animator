import { AnimationEngine } from '../animation/AnimationEngine';

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16); // Simulate ~60fps
  return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('AnimationEngine Core Tests', () => {
  let animationEngine: AnimationEngine;

  beforeEach(() => {
    jest.useFakeTimers();
    animationEngine = new AnimationEngine();
  });

  afterEach(() => {
    animationEngine.stop();
    jest.useRealTimers();
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

    animationEngine.start();

    // Fast-forward time
    jest.advanceTimersByTime(100);

    expect(mockCallback).toHaveBeenCalled();

    unsubscribe();
    expect(animationEngine.getSubscriberCount()).toBe(0);
  });

  it('should reset time correctly', () => {
    animationEngine.start();

    // Simulate some time passing
    jest.advanceTimersByTime(1000);
    expect(animationEngine.getTime()).toBeGreaterThan(0);

    animationEngine.reset();
    expect(animationEngine.getTime()).toBe(0);
  });

  it('should handle multiple subscribers', () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    const unsubscribe1 = animationEngine.subscribe(mockCallback1);
    const unsubscribe2 = animationEngine.subscribe(mockCallback2);

    expect(animationEngine.getSubscriberCount()).toBe(2);

    animationEngine.start();
    jest.advanceTimersByTime(50);

    expect(mockCallback1).toHaveBeenCalled();
    expect(mockCallback2).toHaveBeenCalled();

    unsubscribe1();
    unsubscribe2();
    expect(animationEngine.getSubscriberCount()).toBe(0);
  });

  it('should handle subscriber errors gracefully', () => {
    const mockErrorCallback = jest.fn(() => {
      throw new Error('Test error');
    });
    const mockGoodCallback = jest.fn();

    animationEngine.subscribe(mockErrorCallback);
    animationEngine.subscribe(mockGoodCallback);

    // Should not throw when error callback fails
    expect(() => {
      animationEngine.start();
      jest.advanceTimersByTime(50);
    }).not.toThrow();

    expect(mockGoodCallback).toHaveBeenCalled();
  });

  it('should handle rapid start/stop cycles', () => {
    for (let i = 0; i < 10; i++) {
      animationEngine.start();
      expect(animationEngine.isActive()).toBe(true);

      animationEngine.stop();
      expect(animationEngine.isActive()).toBe(false);
    }
  });

  it('should maintain time continuity across start/stop cycles', () => {
    animationEngine.start();
    jest.advanceTimersByTime(500);
    const time1 = animationEngine.getTime();

    animationEngine.stop();
    animationEngine.start();
    jest.advanceTimersByTime(300);
    const time2 = animationEngine.getTime();

    expect(time2).toBeGreaterThan(time1);
  });
});

describe('Animation Timing Tests', () => {
  let animationEngine: AnimationEngine;

  beforeEach(() => {
    jest.useFakeTimers();
    animationEngine = new AnimationEngine();
  });

  afterEach(() => {
    animationEngine.stop();
    jest.useRealTimers();
  });

  it('should provide accurate timing', () => {
    animationEngine.start();

    jest.advanceTimersByTime(1000);
    const time = animationEngine.getTime();

    // Allow for some timing variance (within 50ms)
    expect(time).toBeGreaterThan(950);
    expect(time).toBeLessThan(1050);
  });

  it('should handle high-frequency updates', () => {
    const updateCounts: number[] = [];
    let callCount = 0;

    const unsubscribe = animationEngine.subscribe(() => {
      callCount++;
      updateCounts.push(animationEngine.getTime());
    });

    animationEngine.start();

    // Simulate 1 second at 60fps
    for (let i = 0; i < 60; i++) {
      jest.advanceTimersByTime(16.67);
    }

    expect(callCount).toBeGreaterThan(50); // Should have called many times
    expect(updateCounts.length).toBe(callCount);

    unsubscribe();
  });
});

describe('Animation Performance Tests', () => {
  let animationEngine: AnimationEngine;

  beforeEach(() => {
    jest.useFakeTimers();
    animationEngine = new AnimationEngine();
  });

  afterEach(() => {
    animationEngine.stop();
    jest.useRealTimers();
  });

  it('should handle large number of subscribers efficiently', () => {
    const subscribers: (() => void)[] = [];
    const mockCallbacks = Array.from({ length: 100 }, () => jest.fn());

    // Add many subscribers
    mockCallbacks.forEach(callback => {
      subscribers.push(animationEngine.subscribe(callback));
    });

    expect(animationEngine.getSubscriberCount()).toBe(100);

    animationEngine.start();
    jest.advanceTimersByTime(50);

    // All callbacks should have been called
    mockCallbacks.forEach(callback => {
      expect(callback).toHaveBeenCalled();
    });

    // Cleanup
    subscribers.forEach(unsubscribe => unsubscribe());
    expect(animationEngine.getSubscriberCount()).toBe(0);
  });

  it('should not leak memory when subscribers are removed', () => {
    const initialCount = animationEngine.getSubscriberCount();

    const unsubscribe = animationEngine.subscribe(() => {});
    expect(animationEngine.getSubscriberCount()).toBe(initialCount + 1);

    unsubscribe();
    expect(animationEngine.getSubscriberCount()).toBe(initialCount);
  });
});
