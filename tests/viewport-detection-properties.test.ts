import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { getViewportState, BREAKPOINTS } from '../lib/mobile-utils';

/**
 * Feature: mobile-optimization, Property 1: Viewport detection accuracy
 * Validates: Requirements 8.1
 */

describe('Viewport Detection Properties', () => {
  /**
   * Property 1: Viewport detection accuracy
   * For any viewport width and height, the viewport detection function SHALL correctly classify
   * the device type (isMobile, isTablet, isDesktop) based on the defined breakpoints AND
   * correctly determine orientation (portrait vs landscape)
   * Validates: Requirements 8.1
   */
  it('Property 1: viewport detection accuracy', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 320, max: 3840 }), // From small mobile to 4K
          height: fc.integer({ min: 240, max: 2160 }), // From small mobile to 4K
        }),
        ({ width, height }) => {
          const state = getViewportState(width, height);

          // Verify returned dimensions match input
          expect(state.width).toBe(width);
          expect(state.height).toBe(height);

          // Verify device type classification based on breakpoints
          const expectedIsMobile = width < BREAKPOINTS.tablet;
          const expectedIsTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
          const expectedIsDesktop = width >= BREAKPOINTS.desktop;

          expect(state.isMobile).toBe(expectedIsMobile);
          expect(state.isTablet).toBe(expectedIsTablet);
          expect(state.isDesktop).toBe(expectedIsDesktop);

          // Verify exactly one device type is true
          const deviceTypeCount = [state.isMobile, state.isTablet, state.isDesktop].filter(Boolean).length;
          expect(deviceTypeCount).toBe(1);

          // Verify orientation detection
          const expectedOrientation = height > width ? 'portrait' : 'landscape';
          expect(state.orientation).toBe(expectedOrientation);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify breakpoint boundaries are handled correctly
   */
  it('breakpoint boundaries are classified correctly', () => {
    // Test exact breakpoint values
    const testCases = [
      // Mobile range
      { width: 320, height: 568, expectedType: 'mobile' },
      { width: 639, height: 800, expectedType: 'mobile' },
      
      // Tablet range
      { width: 640, height: 800, expectedType: 'mobile' }, // Still mobile at 640
      { width: 768, height: 1024, expectedType: 'tablet' },
      { width: 1023, height: 768, expectedType: 'tablet' },
      
      // Desktop range
      { width: 1024, height: 768, expectedType: 'desktop' },
      { width: 1920, height: 1080, expectedType: 'desktop' },
      { width: 3840, height: 2160, expectedType: 'desktop' },
    ];

    for (const { width, height, expectedType } of testCases) {
      const state = getViewportState(width, height);
      
      switch (expectedType) {
        case 'mobile':
          expect(state.isMobile).toBe(true);
          expect(state.isTablet).toBe(false);
          expect(state.isDesktop).toBe(false);
          break;
        case 'tablet':
          expect(state.isMobile).toBe(false);
          expect(state.isTablet).toBe(true);
          expect(state.isDesktop).toBe(false);
          break;
        case 'desktop':
          expect(state.isMobile).toBe(false);
          expect(state.isTablet).toBe(false);
          expect(state.isDesktop).toBe(true);
          break;
      }
    }
  });

  /**
   * Additional test: Verify orientation detection at various aspect ratios
   */
  it('orientation is detected correctly for various aspect ratios', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2160 }),
        fc.integer({ min: 320, max: 2160 }),
        (dim1, dim2) => {
          // Test both orientations
          const portraitState = getViewportState(dim1, dim2);
          const landscapeState = getViewportState(dim2, dim1);

          if (dim1 < dim2) {
            // Portrait: height > width
            expect(portraitState.orientation).toBe('portrait');
            // Landscape: width > height
            expect(landscapeState.orientation).toBe('landscape');
          } else if (dim1 > dim2) {
            // Portrait: height > width
            expect(portraitState.orientation).toBe('landscape');
            // Landscape: width > height
            expect(landscapeState.orientation).toBe('portrait');
          } else {
            // Square: both should be landscape (height === width)
            expect(portraitState.orientation).toBe('landscape');
            expect(landscapeState.orientation).toBe('landscape');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify mobile breakpoint consistency
   */
  it('mobile viewport is correctly identified below tablet breakpoint', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: BREAKPOINTS.tablet - 1 }),
        fc.integer({ min: 240, max: 2160 }),
        (width, height) => {
          const state = getViewportState(width, height);
          
          expect(state.isMobile).toBe(true);
          expect(state.isTablet).toBe(false);
          expect(state.isDesktop).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify tablet breakpoint consistency
   */
  it('tablet viewport is correctly identified between tablet and desktop breakpoints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: BREAKPOINTS.tablet, max: BREAKPOINTS.desktop - 1 }),
        fc.integer({ min: 240, max: 2160 }),
        (width, height) => {
          const state = getViewportState(width, height);
          
          expect(state.isMobile).toBe(false);
          expect(state.isTablet).toBe(true);
          expect(state.isDesktop).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify desktop breakpoint consistency
   */
  it('desktop viewport is correctly identified at or above desktop breakpoint', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: BREAKPOINTS.desktop, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (width, height) => {
          const state = getViewportState(width, height);
          
          expect(state.isMobile).toBe(false);
          expect(state.isTablet).toBe(false);
          expect(state.isDesktop).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
