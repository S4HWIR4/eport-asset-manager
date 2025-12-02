'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { 
  addOptimizedScrollListener, 
  requestAnimationFramePolyfill,
  cancelAnimationFramePolyfill 
} from '@/lib/mobile-utils';

interface OptimizedScrollContainerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onScroll'> {
  onScroll?: (event: Event) => void;
  throttleMs?: number;
  enableSmoothScroll?: boolean;
}

/**
 * Optimized scroll container with performance enhancements
 * - Uses passive event listeners for better scroll performance
 * - Throttles scroll events to prevent excessive handler calls
 * - Supports smooth scrolling with requestAnimationFrame
 * - Ensures 60fps scrolling on mobile devices
 * 
 * @example
 * ```tsx
 * <OptimizedScrollContainer className="h-96 overflow-y-auto">
 *   <div>Long content...</div>
 * </OptimizedScrollContainer>
 * ```
 */
export const OptimizedScrollContainer = React.forwardRef<
  HTMLDivElement,
  OptimizedScrollContainerProps
>(({ 
  className, 
  children, 
  onScroll, 
  throttleMs = 16, 
  enableSmoothScroll = true,
  ...props 
}, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rafIdRef = React.useRef<number | null>(null);

  React.useImperativeHandle(ref, () => containerRef.current!);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !onScroll) return;

    // Optimized scroll handler with RAF for smooth updates
    const handleScroll = (event: Event) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFramePolyfill(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFramePolyfill(() => {
        onScroll(event);
        rafIdRef.current = null;
      });
    };

    // Add optimized scroll listener with passive flag and throttling
    const cleanup = addOptimizedScrollListener(container, handleScroll, throttleMs);

    return () => {
      cleanup();
      if (rafIdRef.current !== null) {
        cancelAnimationFramePolyfill(rafIdRef.current);
      }
    };
  }, [onScroll, throttleMs]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-auto',
        enableSmoothScroll && 'scroll-smooth',
        // Performance optimizations
        'will-change-scroll',
        // Ensure GPU acceleration for smooth scrolling
        'transform-gpu',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

OptimizedScrollContainer.displayName = 'OptimizedScrollContainer';
