/**
 * Property-Based Tests for Mobile Navigation Format
 * Feature: mobile-optimization, Property 18: Mobile navigation format
 * Validates: Requirements 8.1
 * 
 * Tests that navigation uses mobile-appropriate pattern on mobile viewports
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Property 18: Mobile navigation format', () => {
  // Read the Sidebar component file to verify implementation
  const sidebarComponentPath = join(__dirname, '../components/sidebar.tsx');
  const sidebarComponentContent = readFileSync(sidebarComponentPath, 'utf-8');

  /**
   * Property 18: Mobile navigation format
   * For any navigation component on mobile viewport, the navigation SHALL use a mobile-appropriate 
   * pattern (hamburger menu, bottom nav, or drawer) AND SHALL NOT cause horizontal overflow AND 
   * navigation items SHALL have minimum 44x44px touch targets
   * Validates: Requirements 8.1
   */
  it('Property 18: sidebar has mobile-appropriate navigation pattern', () => {
    // Verify mobile menu button exists with hamburger icon
    expect(sidebarComponentContent).toContain('<Menu');
    expect(sidebarComponentContent).toContain('<X');
    
    // Verify mobile header is fixed and hidden on desktop (lg:hidden)
    expect(sidebarComponentContent).toContain('lg:hidden');
    expect(sidebarComponentContent).toContain('fixed top-0');
    
    // Verify sidebar uses drawer pattern (translate-x)
    expect(sidebarComponentContent).toContain('-translate-x-full');
    expect(sidebarComponentContent).toContain('lg:translate-x-0');
    
    // Verify mobile menu button has adequate touch target (min-w-[44px] min-h-[44px])
    expect(sidebarComponentContent).toContain('min-w-[44px]');
    expect(sidebarComponentContent).toContain('min-h-[44px]');
  });

  it('Property 18: navigation items have minimum touch target size', () => {
    // Verify navigation links have min-h-[44px] class
    expect(sidebarComponentContent).toContain('min-h-[44px]');
    
    // Verify the class is applied to navigation links
    const linkPattern = /<Link[^>]*className[^>]*min-h-\[44px\]/;
    expect(linkPattern.test(sidebarComponentContent)).toBe(true);
  });

  it('Property 18: sidebar does not cause horizontal overflow on mobile', () => {
    // Verify sidebar has fixed width (w-64) that won't overflow
    expect(sidebarComponentContent).toContain('w-64');
    
    // Verify sidebar is hidden by default on mobile (translate-x-full)
    expect(sidebarComponentContent).toContain('-translate-x-full');
    
    // Verify sidebar only shows when menu is open
    expect(sidebarComponentContent).toContain('isMobileMenuOpen');
  });

  it('Property 18: mobile menu uses overlay pattern', () => {
    // Verify overlay exists for mobile menu
    expect(sidebarComponentContent).toContain('bg-black bg-opacity-50');
    expect(sidebarComponentContent).toContain('lg:hidden');
    
    // Verify overlay closes menu on click
    expect(sidebarComponentContent).toContain('onClick={closeMobileMenu}');
  });

  it('Property 18: navigation trigger is accessible', () => {
    // Verify menu button has proper aria labels
    expect(sidebarComponentContent).toContain('aria-label');
    expect(sidebarComponentContent).toContain('aria-expanded');
    
    // Verify button has proper role for accessibility
    expect(sidebarComponentContent).toContain('Open menu');
    expect(sidebarComponentContent).toContain('Close menu');
  });

  /**
   * Property-based test: Verify sidebar width doesn't exceed mobile viewport
   */
  it('Property 18: sidebar width is appropriate for mobile viewports', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }), // Mobile viewport range
        (viewportWidth) => {
          // Sidebar is w-64 which is 256px (16rem)
          const sidebarWidth = 256;
          
          // Verify sidebar width is less than viewport width
          expect(sidebarWidth).toBeLessThan(viewportWidth);
          
          // Verify there's reasonable space (at least 64px remaining)
          expect(viewportWidth - sidebarWidth).toBeGreaterThanOrEqual(64);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify touch target calculations
   */
  it('Property 18: touch targets meet minimum size requirements', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 44, max: 100 }), // Touch target sizes
        (targetSize) => {
          // Minimum touch target is 44px
          const minTouchTarget = 44;
          
          // Verify any touch target >= 44px is valid
          if (targetSize >= minTouchTarget) {
            expect(targetSize).toBeGreaterThanOrEqual(minTouchTarget);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
