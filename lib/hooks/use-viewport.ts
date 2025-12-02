'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getViewportState, 
  debounce, 
  PERFORMANCE_CONFIG,
  type ViewportState 
} from '../mobile-utils';

/**
 * Hook to detect and track viewport state with optimized performance
 * Returns current viewport dimensions and device type flags
 * Uses debounced resize handler to prevent excessive re-renders
 * 
 * @param debounceMs - Debounce delay in milliseconds (default: 150ms)
 * @returns ViewportState object with width, height, and device type flags
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, isTablet, isDesktop } = useViewport();
 *   
 *   return (
 *     <div>
 *       {isMobile && <MobileView />}
 *       {isTablet && <TabletView />}
 *       {isDesktop && <DesktopView />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useViewport(
  debounceMs: number = PERFORMANCE_CONFIG.RESIZE_DEBOUNCE_MS
): ViewportState {
  // Initialize with current window dimensions (or defaults for SSR)
  const [viewport, setViewport] = useState<ViewportState>(() => {
    if (typeof window !== 'undefined') {
      return getViewportState(window.innerWidth, window.innerHeight);
    }
    // Default to desktop for SSR
    return {
      width: 1024,
      height: 768,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      orientation: 'landscape',
    };
  });

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Memoize the resize handler to prevent recreation on every render
  const handleResize = useCallback(() => {
    if (isMountedRef.current) {
      const newState = getViewportState(window.innerWidth, window.innerHeight);
      
      // Only update if state actually changed to prevent unnecessary re-renders
      setViewport((prevState) => {
        if (
          prevState.width === newState.width &&
          prevState.height === newState.height &&
          prevState.isMobile === newState.isMobile &&
          prevState.isTablet === newState.isTablet &&
          prevState.isDesktop === newState.isDesktop &&
          prevState.orientation === newState.orientation
        ) {
          return prevState; // No change, return same reference
        }
        return newState;
      });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Set initial state
    handleResize();

    // Create debounced resize handler for performance
    const debouncedHandleResize = debounce(handleResize, debounceMs);

    // Add event listener
    window.addEventListener('resize', debouncedHandleResize);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('resize', debouncedHandleResize);
    };
  }, [handleResize, debounceMs]);

  return viewport;
}
