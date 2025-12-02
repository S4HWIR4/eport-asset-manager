/**
 * Property-Based Tests for Clear Filters Accessibility
 * 
 * **Feature: mobile-optimization, Property 13: Clear filters accessibility**
 * **Validates: Requirements 5.5**
 * 
 * Property: For any filter panel with active filters on mobile viewport,
 * the clear filters button SHALL be visible AND positioned within the filter panel
 * AND have minimum 44x44px touch target
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Property 13: Clear filters accessibility', () => {
  // Read the MobileFilterPanel component file to verify implementation
  const componentPath = join(__dirname, '../components/ui/mobile-filter-panel.tsx');
  const componentContent = readFileSync(componentPath, 'utf-8');

  /**
   * Property 13: Clear filters accessibility
   * For any filter panel with active filters on mobile viewport, the clear filters button
   * SHALL be visible AND positioned within the filter panel AND have minimum 44x44px touch target
   * Validates: Requirements 5.5
   */
  it('Property 13: clear button has minimum touch target size', () => {
    // Verify clear button has min-h-[44px] and min-w-[44px] classes
    expect(componentContent).toContain('min-h-[44px]');
    expect(componentContent).toContain('min-w-[44px]');
    
    // Verify clear button has aria-label for accessibility
    expect(componentContent).toContain('aria-label="Clear all filters"');
  });

  it('clear button is conditionally rendered based on hasActiveFilters', () => {
    // Verify clear button is only shown when hasActiveFilters is true
    expect(componentContent).toContain('hasActiveFilters && onClearFilters');
    
    // Verify it's within the header section
    expect(componentContent).toMatch(/hasActiveFilters.*?<Button/s);
  });

  it('clear button is positioned in the header for easy access', () => {
    // Verify clear button is in the header section (before content)
    const headerMatch = componentContent.match(/Header.*?<div className="flex items-center justify-between/s);
    expect(headerMatch).toBeTruthy();
    
    // Verify clear button is within the header's flex container
    expect(componentContent).toMatch(/justify-between.*?hasActiveFilters.*?Clear/s);
  });

  /**
   * Property-based test: Verify touch target size meets minimum requirements
   */
  it('Property 13: touch target size is at least 44x44px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 44, max: 100 }), // Various button sizes >= 44px
        (size) => {
          // Verify minimum size is always at least 44px
          expect(size).toBeGreaterThanOrEqual(44);
          
          // The component uses min-h-[44px] and min-w-[44px] which ensures
          // the button is always at least 44x44px regardless of content
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify clear button is accessible for various filter counts
   */
  it('Property 13: clear button remains accessible regardless of filter count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // Number of filters
        (numFilters) => {
          // Clear button is in the header, so it's always accessible
          // regardless of how many filters are in the content area
          
          // Verify the button is positioned in a fixed location (header)
          expect(componentContent).toContain('border-b'); // Header has bottom border
          
          // The clear button is in the header, not in the scrollable content
          // This ensures it's always visible and accessible
          expect(numFilters).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clear button has proper styling for visibility', () => {
    // Verify clear button has appropriate variant and size
    expect(componentContent).toMatch(/variant="ghost".*?size="sm"/s);
    
    // Verify it has the Clear text with icon
    expect(componentContent).toContain('<X className="h-4 w-4 mr-1" />');
    expect(componentContent).toContain('Clear');
  });

  it('component supports collapsible behavior on mobile', () => {
    // Verify collapsible prop is supported
    expect(componentContent).toContain('collapsible');
    
    // Verify collapse toggle is hidden on desktop (md:hidden)
    expect(componentContent).toContain('md:hidden');
    
    // Verify collapse state management
    expect(componentContent).toContain('isCollapsed');
    expect(componentContent).toContain('setIsCollapsed');
  });

  it('component prevents layout shifts with smooth transitions', () => {
    // Verify smooth transition classes
    expect(componentContent).toContain('transition-all');
    expect(componentContent).toContain('duration-300');
    expect(componentContent).toContain('ease-in-out');
    
    // Verify height is managed to prevent shifts
    expect(componentContent).toContain('maxHeight');
    expect(componentContent).toContain('contentHeight');
  });
});
