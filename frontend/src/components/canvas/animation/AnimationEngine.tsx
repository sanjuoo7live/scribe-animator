// Animation Engine provides a centralized clock for canvas animations
export class AnimationEngine {
  private isRunning = false;
  private animationId: number | null = null;
  private subscribers: Set<(time: number) => void> = new Set();
  private startTime = 0;
  private currentTime = 0;

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
    this.startTime = performance.now();
    this.currentTime = 0;

    const tick = (timestamp: number) => {
      if (!this.isRunning) return;

      this.currentTime = timestamp - this.startTime;

      // Notify all subscribers
      this.subscribers.forEach(callback => {
        try {
          callback(this.currentTime);
        } catch (error) {
          console.error('Animation subscriber error:', error);
        }
      });

      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }

  // Stop the animation loop
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // Check if running
  isActive(): boolean {
    return this.isRunning;
  }

  // Reset the clock
  reset(): void {
    this.startTime = performance.now();
    this.currentTime = 0;
  }

  // Get subscriber count (for diagnostics)
  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Global animation engine instance
export const animationEngine = new AnimationEngine();
