// Performance diagnostics and telemetry
export class CanvasDiagnostics {
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimes: number[] = [];
  private drawCounts: number[] = [];
  private overlayChurn = 0;

  // Record frame timing
  recordFrame(startTime: number): void {
    const now = performance.now();
    const frameTime = now - startTime;
    this.frameTimes.push(frameTime);
    this.frameCount++;

    // Keep only last 60 frames for rolling average
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }
  }

  // Record draw operations
  recordDraw(count: number): void {
    this.drawCounts.push(count);
    if (this.drawCounts.length > 60) {
      this.drawCounts.shift();
    }
  }

  // Record overlay lifecycle events
  recordOverlayChurn(): void {
    this.overlayChurn++;
  }

  // Get performance metrics
  getMetrics(): {
    avgFrameTime: number;
    p95FrameTime: number;
    avgDrawsPerFrame: number;
    overlayChurnRate: number;
  } {
    const sortedFrameTimes = [...this.frameTimes].sort((a, b) => a - b);
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const p95FrameTime = sortedFrameTimes[Math.floor(sortedFrameTimes.length * 0.95)] || 0;
    const avgDrawsPerFrame = this.drawCounts.reduce((a, b) => a + b, 0) / this.drawCounts.length;

    return {
      avgFrameTime: avgFrameTime || 0,
      p95FrameTime,
      avgDrawsPerFrame: avgDrawsPerFrame || 0,
      overlayChurnRate: this.overlayChurn / Math.max(1, this.frameCount),
    };
  }

  // Reset metrics
  reset(): void {
    this.frameCount = 0;
    this.frameTimes = [];
    this.drawCounts = [];
    this.overlayChurn = 0;
  }

  // Log current metrics to console
  logMetrics(): void {
    const metrics = this.getMetrics();
    console.log('Canvas Performance Metrics:', {
      'Avg Frame Time': `${metrics.avgFrameTime.toFixed(2)}ms`,
      'P95 Frame Time': `${metrics.p95FrameTime.toFixed(2)}ms`,
      'Avg Draws/Frame': metrics.avgDrawsPerFrame.toFixed(1),
      'Overlay Churn Rate': metrics.overlayChurnRate.toFixed(3),
    });
  }
}

// Global diagnostics instance
export const canvasDiagnostics = new CanvasDiagnostics();
