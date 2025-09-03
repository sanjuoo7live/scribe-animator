// Animation Engine provides a centralized clock for canvas animations
export class AnimationEngine {
  private isRunning = false;
  private animationId: number | null = null;
  private rafId: number | null = null;
  private subscribers: Set<(time: number) => void> = new Set();
  private startTime = 0; // kept for reference, not relied upon for deltas
  private currentTime = 0;
  private accumulatedTime = 0; // preserves time across stop/start cycles
  private lastTickTime: number | null = null;

  // Subscribe to animation ticks
  subscribe(callback: (time: number) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Get current animation time
  getTime(): number {
    return this.currentTime;
  }

  // Start the animation loop
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    // Initialize timing references; don't reset accumulated time
    this.startTime = performance.now();
    this.lastTickTime = this.startTime;

  const tick = () => {
      if (!this.isRunning) return;
      const now = performance.now();
      const prev = this.lastTickTime ?? now;
      const delta = Math.max(0, now - prev);
      this.accumulatedTime += delta;
      this.currentTime = this.accumulatedTime;
      this.lastTickTime = now;

      // Notify all subscribers
      this.subscribers.forEach(callback => {
        try {
          callback(this.currentTime);
        } catch (error) {
          console.error('Animation subscriber error:', error);
        }
      });
      // Schedule next tick with requestAnimationFrame for drift-free timing
      if (typeof requestAnimationFrame === 'function') {
        this.rafId = requestAnimationFrame(tick);
      } else {
        // Fallback to timers if rAF not available
        this.animationId = (setTimeout as unknown as (handler: () => void, timeout: number) => number)(tick, 16);
      }
    };
    // Kick off first tick using rAF when possible
    if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(tick);
    } else {
      this.animationId = (setTimeout as unknown as (handler: () => void, timeout: number) => number)(tick, 16);
    }
  }

  // Stop the animation loop
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.animationId !== null) {
      clearTimeout(this.animationId as unknown as number);
      this.animationId = null;
    }
    // Pause ticking; keep accumulatedTime to preserve continuity
    this.lastTickTime = null;

    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      try {
        cancelAnimationFrame(this.rafId);
      } catch {
        // ignore
      }
      this.rafId = null;
    }
  }

  // Check if running
  isActive(): boolean {
    return this.isRunning;
  }

  // Reset the clock
  reset(): void {
  this.startTime = performance.now();
  this.accumulatedTime = 0;
  this.currentTime = 0;
  this.lastTickTime = null;
  }

  // Get subscriber count (for diagnostics)
  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Global animation engine instance
export const animationEngine = new AnimationEngine();
