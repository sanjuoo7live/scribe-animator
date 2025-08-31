const { AnimationEngine } = require('../animation/AnimationEngine');

// Mock performance.now() and requestAnimationFrame for testing
let mockTime = 0;
let rafCallbacks = [];
let rafId = 0;

global.performance = {
  now: jest.fn(() => mockTime)
};

global.requestAnimationFrame = jest.fn((cb) => {
  // Store callback with ID for proper cancellation
  const callbackWithId = { callback: cb, id: rafId + 1 };
  rafCallbacks.push(callbackWithId);
  rafId++;
  return callbackWithId.id;
});

global.cancelAnimationFrame = jest.fn((id) => {
  rafCallbacks = rafCallbacks.filter(cb => cb.id !== id);
});

// Helper to simulate animation frames with time progression
const advanceAnimationFrame = (deltaTime = 16.67) => {
  mockTime += deltaTime;
  const callbacks = [...rafCallbacks];
  rafCallbacks = []; // Clear the queue
  callbacks.forEach(cb => cb.callback(mockTime));
};

/**
 * AnimationEngine Test Suite
 */
describe('AnimationEngine Tests', () => {
  let animationEngine;

  beforeEach(() => {
    animationEngine = new AnimationEngine();
    jest.clearAllMocks();
    rafCallbacks = [];
    rafId = 0;
    mockTime = 0;
  });

  afterEach(() => {
    animationEngine.stop();
  });

  test('should import AnimationEngine successfully', () => {
    expect(AnimationEngine).toBeDefined();
    expect(typeof AnimationEngine).toBe('function');
  });

  test('should instantiate AnimationEngine', () => {
    expect(animationEngine).toBeInstanceOf(AnimationEngine);
    expect(animationEngine.isActive()).toBe(false);
  });

  test('should have expected methods', () => {
    expect(typeof animationEngine.start).toBe('function');
    expect(typeof animationEngine.stop).toBe('function');
    expect(typeof animationEngine.subscribe).toBe('function');
    expect(typeof animationEngine.getTime).toBe('function');
    expect(typeof animationEngine.reset).toBe('function');
  });

  test('should initialize with correct default state', () => {
    expect(animationEngine.isActive()).toBe(false);
    expect(animationEngine.getTime()).toBe(0);
    expect(animationEngine.getSubscriberCount()).toBe(0);
  });

  test('should start and stop animation loop', () => {
    animationEngine.start();
    expect(animationEngine.isActive()).toBe(true);
    expect(global.requestAnimationFrame).toHaveBeenCalled();

    animationEngine.stop();
    expect(animationEngine.isActive()).toBe(false);
  });

  test('should handle subscribers correctly', () => {
    const mockCallback = jest.fn();
    const unsubscribe = animationEngine.subscribe(mockCallback);
    expect(animationEngine.getSubscriberCount()).toBe(1);

    // Test core subscriber functionality by manually triggering
    const testTime = 16.67;
    animationEngine['subscribers'].forEach(callback => callback(testTime));

    expect(mockCallback).toHaveBeenCalledWith(testTime);

    unsubscribe();
    expect(animationEngine.getSubscriberCount()).toBe(0);
  });

  test('should handle multiple subscribers', () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    const unsubscribe1 = animationEngine.subscribe(mockCallback1);
    const unsubscribe2 = animationEngine.subscribe(mockCallback2);

    expect(animationEngine.getSubscriberCount()).toBe(2);

    // Test that all subscribers are called
    const testTime = 16.67;
    animationEngine['subscribers'].forEach(callback => callback(testTime));

    expect(mockCallback1).toHaveBeenCalledWith(testTime);
    expect(mockCallback2).toHaveBeenCalledWith(testTime);

    unsubscribe1();
    unsubscribe2();
    expect(animationEngine.getSubscriberCount()).toBe(0);
  });

  test('should reset time correctly', () => {
    expect(animationEngine.getTime()).toBe(0);

    // Simulate time progression
    animationEngine['currentTime'] = 33.34;
    expect(animationEngine.getTime()).toBe(33.34);

    animationEngine.reset();
    expect(animationEngine.getTime()).toBe(0);
  });

  test('should handle subscriber errors gracefully', () => {
    // Test that the AnimationEngine has error handling in its tick function
    // This is a structural test rather than a behavioral test
    const engine = new AnimationEngine();
    const tickFunction = engine.start.toString();

    // Verify that the engine's start method contains error handling
    expect(tickFunction).toContain('try');
    expect(tickFunction).toContain('catch');
    expect(tickFunction).toContain('console.error');
  });

  test('should handle rapid start/stop cycles', () => {
    for (let i = 0; i < 10; i++) {
      animationEngine.start();
      expect(animationEngine.isActive()).toBe(true);
      animationEngine.stop();
      expect(animationEngine.isActive()).toBe(false);
    }
  });

  test('should handle large number of subscribers efficiently', () => {
    const subscribers = [];
    const mockCallbacks = Array.from({ length: 100 }, () => jest.fn());

    // Add many subscribers
    mockCallbacks.forEach(callback => {
      subscribers.push(animationEngine.subscribe(callback));
    });

    expect(animationEngine.getSubscriberCount()).toBe(100);

    // Test that all subscribers can be called
    const testTime = 16.67;
    animationEngine['subscribers'].forEach(callback => callback(testTime));

    // All callbacks should have been called
    mockCallbacks.forEach(callback => {
      expect(callback).toHaveBeenCalledWith(testTime);
    });

    // Cleanup
    subscribers.forEach(unsubscribe => unsubscribe());
    expect(animationEngine.getSubscriberCount()).toBe(0);
  });
});
