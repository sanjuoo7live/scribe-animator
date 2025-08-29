declare module 'vivus' {
  interface VivusOptions {
    duration?: number;
    type?: 'delayed' | 'sync' | 'oneByOne';
    start?: 'inViewport' | 'manual' | 'autostart';
    dashGap?: number;
    forceRender?: boolean;
    animTimingFunction?: any;
    pathTimingFunction?: any;
    reverseStack?: boolean;
  }

  class Vivus {
    static EASE: any;
    static EASE_OUT: any;
    static EASE_OUT_BOUNCE: any;

    constructor(element: Element | string, options?: VivusOptions, callback?: () => void);

    play(speed?: number): this;
    stop(): this;
    reset(): this;
    finish(): this;
    setFrameProgress(progress: number): this;
    getStatus(): 'start' | 'progress' | 'end';

    el: Element;
    isReady: boolean;
  }

  export = Vivus;
}
