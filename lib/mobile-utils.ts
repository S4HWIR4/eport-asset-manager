/**
 * Mobile utility functions for responsive design and touch interactions
 */

/**
 * Viewport breakpoints matching Tailwind defaults
 */
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  large: 1280,
} as const;

/**
 * Performance configuration
 */
export const PERFORMANCE_CONFIG = {
  RESIZE_DEBOUNCE_MS: 150,
  SCROLL_THROTTLE_MS: 16, // ~60fps
  TOUCH_PASSIVE: true,
} as const;

/**
 * Minimum touch target size per WCAG 2.1 Level AAA
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Minimum spacing between touch targets
 */
export const MIN_TOUCH_TARGET_SPACING = 8;

/**
 * Viewport state interface
 */
export interface ViewportState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

/**
 * Get current viewport state
 * @param width - Window width
 * @param height - Window height
 * @returns ViewportState object
 */
export function getViewportState(width: number, height: number): ViewportState {
  const isMobile = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const orientation = height > width ? 'portrait' : 'landscape';

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    orientation,
  };
}

/**
 * Touch target validation result
 */
export interface TouchTargetValidation {
  isValid: boolean;
  width: number;
  height: number;
  meetsMinimumSize: boolean;
  hasAdequateSpacing: boolean;
  issues: string[];
}

/**
 * Validate touch target size and spacing
 * @param element - HTML element to validate
 * @param adjacentElements - Array of adjacent interactive elements
 * @returns TouchTargetValidation result
 */
export function validateTouchTarget(
  element: HTMLElement,
  adjacentElements: HTMLElement[] = []
): TouchTargetValidation {
  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const meetsMinimumSize = width >= MIN_TOUCH_TARGET_SIZE && height >= MIN_TOUCH_TARGET_SIZE;
  const issues: string[] = [];

  if (!meetsMinimumSize) {
    issues.push(
      `Touch target size ${width}x${height}px is below minimum ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE}px`
    );
  }

  // Check spacing with adjacent elements
  let hasAdequateSpacing = true;
  for (const adjacent of adjacentElements) {
    const adjacentRect = adjacent.getBoundingClientRect();
    
    // Calculate minimum distance between elements
    const horizontalDistance = Math.max(
      0,
      Math.max(rect.left - adjacentRect.right, adjacentRect.left - rect.right)
    );
    const verticalDistance = Math.max(
      0,
      Math.max(rect.top - adjacentRect.bottom, adjacentRect.top - rect.bottom)
    );
    
    const minDistance = Math.min(horizontalDistance, verticalDistance);
    
    if (minDistance < MIN_TOUCH_TARGET_SPACING && minDistance >= 0) {
      hasAdequateSpacing = false;
      issues.push(
        `Touch target spacing ${minDistance}px is below minimum ${MIN_TOUCH_TARGET_SPACING}px`
      );
    }
  }

  return {
    isValid: meetsMinimumSize && hasAdequateSpacing,
    width,
    height,
    meetsMinimumSize,
    hasAdequateSpacing,
    issues,
  };
}

/**
 * Scroll lock state
 */
let scrollLockCount = 0;
let originalBodyOverflow = '';
let originalBodyPosition = '';
let originalBodyTop = '';
let originalBodyWidth = '';
let scrollPosition = 0;

/**
 * Lock body scroll (for modal interactions)
 * Prevents background scrolling while maintaining scroll position
 */
export function lockScroll(): void {
  if (scrollLockCount === 0) {
    // Store original values
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    originalBodyOverflow = document.body.style.overflow;
    originalBodyPosition = document.body.style.position;
    originalBodyTop = document.body.style.top;
    originalBodyWidth = document.body.style.width;

    // Apply scroll lock
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';
  }
  
  scrollLockCount++;
}

/**
 * Unlock body scroll (restore scrolling)
 * Restores original scroll position and body styles
 */
export function unlockScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  
  if (scrollLockCount === 0) {
    // Restore original values
    document.body.style.overflow = originalBodyOverflow;
    document.body.style.position = originalBodyPosition;
    document.body.style.top = originalBodyTop;
    document.body.style.width = originalBodyWidth;

    // Restore scroll position
    window.scrollTo(0, scrollPosition);
  }
}

/**
 * Check if scroll is currently locked
 * @returns true if scroll is locked
 */
export function isScrollLocked(): boolean {
  return scrollLockCount > 0;
}

/**
 * Reset scroll lock state (useful for cleanup in tests)
 */
export function resetScrollLock(): void {
  if (scrollLockCount > 0) {
    // Restore body styles
    document.body.style.overflow = originalBodyOverflow;
    document.body.style.position = originalBodyPosition;
    document.body.style.top = originalBodyTop;
    document.body.style.width = originalBodyWidth;
  }
  
  scrollLockCount = 0;
  originalBodyOverflow = '';
  originalBodyPosition = '';
  originalBodyTop = '';
  originalBodyWidth = '';
  scrollPosition = 0;
}

/**
 * Debounce function for performance optimization
 * Delays function execution until after wait time has elapsed since last call
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * Ensures function is called at most once per specified time period
 * 
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request animation frame wrapper for smooth animations
 * Ensures callback runs at optimal time for rendering
 * 
 * @param callback - Function to execute on next frame
 * @returns Request ID that can be used to cancel
 */
export function requestAnimationFramePolyfill(callback: () => void): number {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  }
  // Fallback for environments without RAF
  return setTimeout(callback, 16) as unknown as number;
}

/**
 * Cancel animation frame wrapper
 * 
 * @param id - Request ID to cancel
 */
export function cancelAnimationFramePolyfill(id: number): void {
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

/**
 * Get Core Web Vitals metrics
 * Returns performance metrics for mobile optimization validation
 * 
 * @returns PerformanceMetrics object
 */
export function getCoreWebVitals(): PerformanceMetrics {
  if (typeof window === 'undefined' || !window.performance) {
    return {};
  }

  const metrics: PerformanceMetrics = {};

  try {
    // Get navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.ttfb = navigation.responseStart - navigation.requestStart;
    }

    // Get paint timing
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    if (fcp) {
      metrics.fcp = fcp.startTime;
    }

    // LCP, FID, and CLS require PerformanceObserver which should be set up separately
    // This function returns what's immediately available
  } catch (error) {
    console.warn('Error getting Core Web Vitals:', error);
  }

  return metrics;
}

/**
 * Setup performance observer for Core Web Vitals
 * Monitors LCP, FID, and CLS metrics
 * 
 * @param callback - Callback function to receive metrics
 * @returns Cleanup function to disconnect observer
 */
export function observeCoreWebVitals(
  callback: (metric: { name: string; value: number }) => void
): () => void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {};
  }

  const observers: PerformanceObserver[] = [];

  try {
    // Observe Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry;
      callback({ name: 'LCP', value: lastEntry.startTime });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    observers.push(lcpObserver);

    // Observe First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        callback({ name: 'FID', value: entry.processingStart - entry.startTime });
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
    observers.push(fidObserver);

    // Observe Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          callback({ name: 'CLS', value: clsValue });
        }
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    observers.push(clsObserver);
  } catch (error) {
    console.warn('Error setting up performance observers:', error);
  }

  // Return cleanup function
  return () => {
    observers.forEach((observer) => observer.disconnect());
  };
}

/**
 * Check if device supports passive event listeners
 * Used for performance optimization of scroll/touch events
 * 
 * @returns true if passive listeners are supported
 */
export function supportsPassiveEvents(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  let passiveSupported = false;

  try {
    const options = {
      get passive() {
        passiveSupported = true;
        return false;
      },
    };

    const noop = () => {};
    window.addEventListener('test', noop, options);
    window.removeEventListener('test', noop);
  } catch (err) {
    passiveSupported = false;
  }

  return passiveSupported;
}

/**
 * Get optimized event listener options for scroll/touch events
 * Returns passive: true if supported for better performance
 * 
 * @returns EventListenerOptions object
 */
export function getPassiveEventOptions(): AddEventListenerOptions {
  return supportsPassiveEvents() ? { passive: true } : false as any;
}

/**
 * Measure frame rate over a period of time
 * Useful for validating 60fps scrolling performance
 * 
 * @param duration - Duration to measure in milliseconds
 * @returns Promise resolving to average FPS
 */
export function measureFrameRate(duration: number = 1000): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(60); // Default for SSR
      return;
    }

    let frameCount = 0;
    let startTime = performance.now();
    let rafId: number;

    const countFrame = () => {
      frameCount++;
      const elapsed = performance.now() - startTime;

      if (elapsed < duration) {
        rafId = requestAnimationFrame(countFrame);
      } else {
        const fps = (frameCount / elapsed) * 1000;
        resolve(Math.round(fps));
      }
    };

    rafId = requestAnimationFrame(countFrame);
  });
}

/**
 * Optimize touch event handler with passive listener
 * Wraps touch event handler with performance optimizations
 * 
 * @param element - Element to attach listener to
 * @param event - Event type (touchstart, touchmove, touchend)
 * @param handler - Event handler function
 * @returns Cleanup function to remove listener
 */
export function addOptimizedTouchListener(
  element: HTMLElement | Window,
  event: string,
  handler: EventListener
): () => void {
  const options = getPassiveEventOptions();
  element.addEventListener(event, handler, options);

  return () => {
    element.removeEventListener(event, handler, options as any);
  };
}

/**
 * Optimize scroll event handler with throttling and passive listener
 * Wraps scroll event handler with performance optimizations
 * 
 * @param element - Element to attach listener to
 * @param handler - Event handler function
 * @param throttleMs - Throttle interval in milliseconds
 * @returns Cleanup function to remove listener
 */
export function addOptimizedScrollListener(
  element: HTMLElement | Window,
  handler: EventListener,
  throttleMs: number = PERFORMANCE_CONFIG.SCROLL_THROTTLE_MS
): () => void {
  const throttledHandler = throttle(handler, throttleMs);
  const options = getPassiveEventOptions();
  element.addEventListener('scroll', throttledHandler, options);

  return () => {
    element.removeEventListener('scroll', throttledHandler, options as any);
  };
}
