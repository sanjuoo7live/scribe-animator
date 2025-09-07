import React from 'react';

/**
 * Returns a throttled version of the callback that only executes at most once
 * every `delay` milliseconds. Subsequent calls within the delay window will
 * result in the callback running once after the window ends (trailing call).
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(
  cb: T,
  delay = 100,
  deps: React.DependencyList = []
): (...funcArgs: Parameters<T>) => void {
  const last = React.useRef(0);
  // Initialize with null to satisfy TS and guard clearTimeout
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = React.useRef(cb);

  React.useEffect(() => {
    cbRef.current = cb;
    return () => {
      if (timeout.current !== null) clearTimeout(timeout.current);
    };
  }, [cb, ...deps]);

  return React.useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = delay - (now - last.current);
      if (remaining <= 0) {
        last.current = now;
        cbRef.current(...args);
      } else {
        if (timeout.current !== null) clearTimeout(timeout.current);
        timeout.current = setTimeout(() => {
          last.current = Date.now();
          cbRef.current(...args);
        }, remaining);
      }
    },
    [delay]
  );
}

export default useThrottledCallback;
