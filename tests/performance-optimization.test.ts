/**
 * Performance Optimization Tests
 * 
 * Tests for mobile performance optimizations including:
 * - Debounced resize handlers
 * - Passive event listeners
 * - Throttled scroll handlers
 * - Frame rate measurement
 * - Core Web Vitals monitoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  debounce,
  throttle,
  supportsPassiveEvents,
  getPassiveEventOptions,
  measureFrameRate,
  getCoreWebVitals,
  PERFORMANCE_CONFIG,
} from '@/lib/mobile-utils';

describe('Performance Optimization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments correctly', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('test', 123);
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('test', 123);
    });

    it('should use configured debounce time', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, PERFORMANCE_CONFIG.RESIZE_DEBOUNCE_MS);

      debouncedFn();
      vi.advanceTimersByTime(PERFORMANCE_CONFIG.RESIZE_DEBOUNCE_MS - 1);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should limit function calls', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      throttledFn();
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call immediately on first invocation', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments correctly', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should use configured throttle time for scroll', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, PERFORMANCE_CONFIG.SCROLL_THROTTLE_MS);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      throttledFn();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(PERFORMANCE_CONFIG.SCROLL_THROTTLE_MS);
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('passive event listeners', () => {
    it('should detect passive event support', () => {
      const result = supportsPassiveEvents();
      expect(typeof result).toBe('boolean');
    });

    it('should return correct event options', () => {
      const options = getPassiveEventOptions();
      
      if (supportsPassiveEvents()) {
        expect(options).toEqual({ passive: true });
      } else {
        expect(options).toBe(false);
      }
    });

    it('should enable passive listeners when supported', () => {
      if (supportsPassiveEvents()) {
        const options = getPassiveEventOptions();
        expect(options).toHaveProperty('passive', true);
      }
    });
  });

  describe('frame rate measurement', () => {
    it('should measure frame rate', async () => {
      // Mock requestAnimationFrame
      let rafCallback: ((time: number) => void) | null = null;
      const mockRaf = vi.fn((callback: (time: number) => void) => {
        rafCallback = callback;
        return 1;
      });
      global.requestAnimationFrame = mockRaf as any;

      const fpsPromise = measureFrameRate(100);

      // Simulate frames
      for (let i = 0; i < 10; i++) {
        if (rafCallback) {
          rafCallback(performance.now());
        }
      }

      const fps = await fpsPromise;
      expect(typeof fps).toBe('number');
      expect(fps).toBeGreaterThan(0);
    });

    it('should return default FPS for SSR', async () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const fps = await measureFrameRate(100);
      expect(fps).toBe(60);

      global.window = originalWindow;
    });
  });

  describe('Core Web Vitals', () => {
    it('should get available performance metrics', () => {
      const metrics = getCoreWebVitals();
      expect(typeof metrics).toBe('object');
    });

    it('should handle missing performance API', () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;

      const metrics = getCoreWebVitals();
      expect(metrics).toEqual({});

      global.performance = originalPerformance;
    });

    it('should return metrics object with expected structure', () => {
      const metrics = getCoreWebVitals();
      
      // Metrics should be an object
      expect(typeof metrics).toBe('object');
      
      // If metrics are present, they should be numbers
      if (metrics.ttfb !== undefined) {
        expect(typeof metrics.ttfb).toBe('number');
      }
      if (metrics.fcp !== undefined) {
        expect(typeof metrics.fcp).toBe('number');
      }
    });

    it('should handle errors gracefully', () => {
      const originalGetEntriesByType = performance.getEntriesByType;
      performance.getEntriesByType = vi.fn(() => {
        throw new Error('Test error');
      });

      // Should not throw, should return empty object
      const metrics = getCoreWebVitals();
      expect(typeof metrics).toBe('object');

      performance.getEntriesByType = originalGetEntriesByType;
    });
  });

  describe('performance configuration', () => {
    it('should have reasonable debounce time', () => {
      expect(PERFORMANCE_CONFIG.RESIZE_DEBOUNCE_MS).toBeGreaterThan(0);
      expect(PERFORMANCE_CONFIG.RESIZE_DEBOUNCE_MS).toBeLessThan(500);
    });

    it('should have 60fps throttle time', () => {
      // 60fps = ~16.67ms per frame
      expect(PERFORMANCE_CONFIG.SCROLL_THROTTLE_MS).toBeLessThanOrEqual(17);
      expect(PERFORMANCE_CONFIG.SCROLL_THROTTLE_MS).toBeGreaterThan(0);
    });

    it('should enable passive touch events', () => {
      expect(PERFORMANCE_CONFIG.TOUCH_PASSIVE).toBe(true);
    });
  });

  describe('resize handler optimization', () => {
    it('should debounce resize events', () => {
      const handler = vi.fn();
      const debouncedHandler = debounce(handler, PERFORMANCE_CONFIG.RESIZE_DEBOUNCE_MS);

      // Simulate rapid resize events
      for (let i = 0; i < 10; i++) {
        debouncedHandler();
        vi.advanceTimersByTime(10);
      }

      // Handler should not be called yet
      expect(handler).not.toHaveBeenCalled();

      // Wait for debounce to complete
      vi.advanceTimersByTime(PERFORMANCE_CONFIG.RESIZE_DEBOUNCE_MS);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('scroll handler optimization', () => {
    it('should throttle scroll events', () => {
      const handler = vi.fn();
      const throttledHandler = throttle(handler, PERFORMANCE_CONFIG.SCROLL_THROTTLE_MS);

      // First call should execute immediately
      throttledHandler();
      expect(handler).toHaveBeenCalledTimes(1);

      // Rapid calls should be throttled
      for (let i = 0; i < 10; i++) {
        throttledHandler();
      }
      expect(handler).toHaveBeenCalledTimes(1);

      // After throttle period, next call should execute
      vi.advanceTimersByTime(PERFORMANCE_CONFIG.SCROLL_THROTTLE_MS);
      throttledHandler();
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('60fps performance target', () => {
    it('should target 60fps with 16ms throttle', () => {
      const targetFps = 60;
      const frameTime = 1000 / targetFps;
      
      expect(PERFORMANCE_CONFIG.SCROLL_THROTTLE_MS).toBeLessThanOrEqual(Math.ceil(frameTime));
    });

    it('should allow smooth scrolling at 60fps', () => {
      const handler = vi.fn();
      const throttledHandler = throttle(handler, PERFORMANCE_CONFIG.SCROLL_THROTTLE_MS);

      // Simulate 1 second of scroll events at 60fps
      const frames = 60;
      const frameTime = 1000 / frames;

      for (let i = 0; i < frames; i++) {
        throttledHandler();
        vi.advanceTimersByTime(frameTime);
      }

      // Should have called handler multiple times
      // With 16ms throttle and 16.67ms frame time, we get approximately 1 call per frame
      expect(handler.mock.calls.length).toBeGreaterThan(1);
      
      // Should be approximately 60 calls (1 per throttle period at 60fps)
      // Allow some variance due to timing
      expect(handler.mock.calls.length).toBeGreaterThanOrEqual(50);
      expect(handler.mock.calls.length).toBeLessThanOrEqual(65);
    });
  });
});
