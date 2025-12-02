'use client';

import { useEffect, useState } from 'react';
import { 
  observeCoreWebVitals, 
  getCoreWebVitals,
  type PerformanceMetrics 
} from '../mobile-utils';

/**
 * Hook to monitor Core Web Vitals performance metrics
 * Tracks FCP, LCP, FID, CLS, and TTFB for mobile optimization validation
 * 
 * @returns PerformanceMetrics object with current metrics
 * 
 * @example
 * ```tsx
 * function PerformanceMonitor() {
 *   const metrics = usePerformance();
 *   
 *   return (
 *     <div>
 *       <p>FCP: {metrics.fcp}ms</p>
 *       <p>LCP: {metrics.lcp}ms</p>
 *       <p>CLS: {metrics.cls}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePerformance(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(() => {
    if (typeof window !== 'undefined') {
      return getCoreWebVitals();
    }
    return {};
  });

  useEffect(() => {
    // Get initial metrics
    setMetrics(getCoreWebVitals());

    // Observe ongoing metrics
    const cleanup = observeCoreWebVitals((metric) => {
      setMetrics((prev) => ({
        ...prev,
        [metric.name.toLowerCase()]: metric.value,
      }));
    });

    return cleanup;
  }, []);

  return metrics;
}

/**
 * Hook to validate Core Web Vitals against mobile thresholds
 * Returns validation status for each metric
 * 
 * Thresholds (mobile):
 * - FCP: < 1800ms (good), < 3000ms (needs improvement)
 * - LCP: < 2500ms (good), < 4000ms (needs improvement)
 * - FID: < 100ms (good), < 300ms (needs improvement)
 * - CLS: < 0.1 (good), < 0.25 (needs improvement)
 * - TTFB: < 800ms (good), < 1800ms (needs improvement)
 * 
 * @returns Validation object with status for each metric
 * 
 * @example
 * ```tsx
 * function PerformanceValidator() {
 *   const validation = usePerformanceValidation();
 *   
 *   return (
 *     <div>
 *       <p>LCP: {validation.lcp}</p>
 *       <p>CLS: {validation.cls}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePerformanceValidation(): Record<string, 'good' | 'needs-improvement' | 'poor' | 'unknown'> {
  const metrics = usePerformance();

  const validation: Record<string, 'good' | 'needs-improvement' | 'poor' | 'unknown'> = {};

  // Validate FCP
  if (metrics.fcp !== undefined) {
    if (metrics.fcp < 1800) {
      validation.fcp = 'good';
    } else if (metrics.fcp < 3000) {
      validation.fcp = 'needs-improvement';
    } else {
      validation.fcp = 'poor';
    }
  } else {
    validation.fcp = 'unknown';
  }

  // Validate LCP
  if (metrics.lcp !== undefined) {
    if (metrics.lcp < 2500) {
      validation.lcp = 'good';
    } else if (metrics.lcp < 4000) {
      validation.lcp = 'needs-improvement';
    } else {
      validation.lcp = 'poor';
    }
  } else {
    validation.lcp = 'unknown';
  }

  // Validate FID
  if (metrics.fid !== undefined) {
    if (metrics.fid < 100) {
      validation.fid = 'good';
    } else if (metrics.fid < 300) {
      validation.fid = 'needs-improvement';
    } else {
      validation.fid = 'poor';
    }
  } else {
    validation.fid = 'unknown';
  }

  // Validate CLS
  if (metrics.cls !== undefined) {
    if (metrics.cls < 0.1) {
      validation.cls = 'good';
    } else if (metrics.cls < 0.25) {
      validation.cls = 'needs-improvement';
    } else {
      validation.cls = 'poor';
    }
  } else {
    validation.cls = 'unknown';
  }

  // Validate TTFB
  if (metrics.ttfb !== undefined) {
    if (metrics.ttfb < 800) {
      validation.ttfb = 'good';
    } else if (metrics.ttfb < 1800) {
      validation.ttfb = 'needs-improvement';
    } else {
      validation.ttfb = 'poor';
    }
  } else {
    validation.ttfb = 'unknown';
  }

  return validation;
}
