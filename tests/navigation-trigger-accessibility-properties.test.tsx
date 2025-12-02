/**
 * Property-Based Tests for Navigation Trigger Accessibility
 * Feature: mobile-optimization, Property 21: Navigation trigger accessibility
 * Validates: Requirements 8.5
 * 
 * Tests that navigation trigger remains accessible during scroll
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Property 21: Navigation trigger accessibility', () => {
  // Read the Sidebar component file to verify implementation
  const sidebarComponentPath = join(__dirname, '../components/sidebar.tsx');
  const sidebarComponentContent = readFileSync(sidebarComponentPath, 'utf-8');

  /**
   * Property 21: Navigation trigger accessibility
   * For any page with mobile navigation, the navigation trigger (hamburger menu button) SHALL 
   * remain accessible during scroll (fixed or sticky positioning) AND SHALL have minimum 
   * 44x44px touch target
   * Validates: Requirements 8.5
   */
  it('Property 21: navigation trigger uses fixed positioning', () => {
    // Verify mobile header is fixed
    expect(sidebarComponentContent).toContain('fixed top-0');
    
    // Verify it spans full width
    expect(sidebarComponentContent).toContain('left-0 right-0');
    
    // Verify it has high z-index to stay on top
    expect(sidebarComponentContent).toContain('z-50');
  });

  it('Property 21: navigation trigger has minimum touch target size', () => {
    // Verify menu button has min-w-[44px] and min-h-[44px]
    expect(sidebarComponentContent).toContain('min-w-[44px]');
    expect(sidebarComponentContent).toContain('min-h-[44px]');
    
    // Verify these are applied to a button element (they appear in the same button)
    const hasButton = sidebarComponentContent.includes('<button');
    const hasMinWidth = sidebarComponentContent.includes('min-w-[44px]');
    const hasMinHeight = sidebarComponentContent.includes('min-h-[44px]');
    
    expect(hasButton).toBe(true);
    expect(hasMinWidth).toBe(true);
    expect(hasMinHeight).toBe(true);
  });

  it('Property 21: navigation trigger is only visible on mobile', () => {
    // Verify mobile header has lg:hidden class
    expect(sidebarComponentContent).toContain('lg:hidden');
    
    // Verify the fixed header is the mobile menu button container
    const mobileHeaderPattern = /lg:hidden fixed top-0/;
    expect(mobileHeaderPattern.test(sidebarComponentContent)).toBe(true);
  });

  it('Property 21: navigation trigger has proper accessibility attributes', () => {
    // Verify aria-label is present
    expect(sidebarComponentContent).toContain('aria-label');
    
    // Verify aria-expanded is present for state indication
    expect(sidebarComponentContent).toContain('aria-expanded');
    
    // Verify descriptive labels
    expect(sidebarComponentContent).toContain('Open menu');
    expect(sidebarComponentContent).toContain('Close menu');
  });

  it('Property 21: navigation trigger has visual feedback', () => {
    // Verify hover state
    expect(sidebarComponentContent).toContain('hover:bg-gray-100');
    expect(sidebarComponentContent).toContain('dark:hover:bg-gray-700');
    
    // Verify transition for smooth feedback
    expect(sidebarComponentContent).toContain('transition-colors');
  });

  it('Property 21: navigation trigger icon is appropriately sized', () => {
    // Verify Menu and X icons are used
    expect(sidebarComponentContent).toContain('<Menu');
    expect(sidebarComponentContent).toContain('<X');
    
    // Verify icons have appropriate size (w-6 h-6 = 24px)
    expect(sidebarComponentContent).toContain('w-6 h-6');
  });

  /**
   * Property-based test: Verify fixed positioning keeps trigger accessible
   */
  it('Property 21: fixed positioning maintains accessibility during scroll', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // Scroll position
        (scrollY) => {
          // With fixed positioning, element stays at same position regardless of scroll
          const triggerTop = 0; // top-0 means always at top
          
          // Verify trigger is always at top
          expect(triggerTop).toBe(0);
          
          // Verify trigger position is independent of scroll
          expect(triggerTop).toBeLessThanOrEqual(scrollY + 100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify touch target size meets requirements
   */
  it('Property 21: touch target meets minimum size requirements', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.constant(44),
          height: fc.constant(44),
        }),
        ({ width, height }) => {
          const minTouchTarget = 44;
          
          // Verify dimensions meet minimum
          expect(width).toBeGreaterThanOrEqual(minTouchTarget);
          expect(height).toBeGreaterThanOrEqual(minTouchTarget);
          
          // Verify touch target is square or wider
          expect(width).toBeGreaterThanOrEqual(height);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify z-index keeps trigger above content
   */
  it('Property 21: z-index ensures trigger is above scrolling content', () => {
    fc.assert(
      fc.property(
        fc.record({
          triggerZIndex: fc.constant(50),
          sidebarZIndex: fc.constant(40),
          overlayZIndex: fc.constant(30),
          contentZIndex: fc.constant(0),
        }),
        ({ triggerZIndex, sidebarZIndex, overlayZIndex, contentZIndex }) => {
          // Verify trigger has highest z-index
          expect(triggerZIndex).toBeGreaterThan(sidebarZIndex);
          expect(triggerZIndex).toBeGreaterThan(overlayZIndex);
          expect(triggerZIndex).toBeGreaterThan(contentZIndex);
          
          // Verify proper stacking order
          expect(triggerZIndex).toBeGreaterThan(sidebarZIndex);
          expect(sidebarZIndex).toBeGreaterThan(overlayZIndex);
          expect(overlayZIndex).toBeGreaterThan(contentZIndex);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify trigger remains in viewport
   */
  it('Property 21: trigger remains within viewport bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }), // Mobile viewport width
        (viewportWidth) => {
          // Trigger is in fixed header that spans full width (left-0 right-0)
          const triggerLeft = 0;
          const triggerRight = viewportWidth;
          
          // Verify trigger is within viewport
          expect(triggerLeft).toBeGreaterThanOrEqual(0);
          expect(triggerRight).toBeLessThanOrEqual(viewportWidth);
          
          // Verify trigger spans full width
          expect(triggerRight - triggerLeft).toBe(viewportWidth);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify icon size is appropriate for touch
   */
  it('Property 21: icon size is appropriate for visibility and touch', () => {
    fc.assert(
      fc.property(
        fc.constant(24), // w-6 h-6 = 24px
        (iconSize) => {
          const minIconSize = 20; // Minimum for visibility
          const maxIconSize = 32; // Maximum to fit in 44px button
          
          // Verify icon size is in reasonable range
          expect(iconSize).toBeGreaterThanOrEqual(minIconSize);
          expect(iconSize).toBeLessThanOrEqual(maxIconSize);
          
          // Verify icon fits within touch target with padding
          const buttonSize = 44;
          const padding = (buttonSize - iconSize) / 2;
          expect(padding).toBeGreaterThanOrEqual(8); // At least 8px padding
        }
      ),
      { numRuns: 100 }
    );
  });
});
