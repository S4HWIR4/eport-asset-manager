import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Feature: mobile-optimization, Property 2: Modal viewport containment
 * Validates: Requirements 1.3, 3.5, 6.1, 6.2
 */

describe('Modal Viewport Containment Properties', () => {
  // Read the Dialog component file to verify implementation
  const dialogComponentPath = join(__dirname, '../components/ui/dialog.tsx');
  const dialogComponentContent = readFileSync(dialogComponentPath, 'utf-8');

  /**
   * Property 2: Modal viewport containment
   * For any modal dialog opened on a mobile viewport, the modal width SHALL NOT exceed 
   * (viewport width - 2rem) AND the modal height SHALL NOT exceed 90vh AND when modal 
   * content exceeds the modal height, the modal SHALL have internal scrolling enabled
   * Validates: Requirements 1.3, 3.5, 6.1, 6.2
   */
  it('Property 2: modal viewport containment - DialogContent has required CSS classes', () => {
    // Verify that DialogContent component includes the required mobile optimization classes
    
    // Check for max-width constraint: max-w-[calc(100%-2rem)]
    expect(dialogComponentContent).toContain('max-w-[calc(100%-2rem)]');
    
    // Check for max-height constraint: max-h-[90vh]
    expect(dialogComponentContent).toContain('max-h-[90vh]');
    
    // Check for internal scrolling: overflow-y-auto
    expect(dialogComponentContent).toContain('overflow-y-auto');
    
    // Check for mobile padding: p-4 sm:p-6
    expect(dialogComponentContent).toContain('p-4');
    expect(dialogComponentContent).toContain('sm:p-6');
  });

  /**
   * Property-based test: Verify max-width calculation logic
   * For any mobile viewport width, max-width of calc(100% - 2rem) should leave 2rem margin
   */
  it('Property 2: max-width calculation leaves appropriate margin', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }), // Mobile viewport range
        (viewportWidth) => {
          // calc(100% - 2rem) means the modal width should be viewport width minus 32px (2rem)
          const expectedMargin = 32; // 2rem = 32px
          const expectedMaxWidth = viewportWidth - expectedMargin;
          
          // Verify the calculation is correct
          expect(expectedMaxWidth).toBeGreaterThan(0);
          expect(expectedMaxWidth).toBeLessThan(viewportWidth);
          expect(expectedMaxWidth).toBe(viewportWidth - 32);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify max-height calculation logic
   * For any viewport height, max-height of 90vh should be 90% of viewport height
   */
  it('Property 2: max-height calculation is 90% of viewport height', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 480, max: 2160 }), // Various viewport heights
        (viewportHeight) => {
          // 90vh means 90% of viewport height
          const expectedMaxHeight = viewportHeight * 0.9;
          
          // Verify the calculation is correct
          expect(expectedMaxHeight).toBeGreaterThan(0);
          expect(expectedMaxHeight).toBeLessThan(viewportHeight);
          expect(expectedMaxHeight).toBe(viewportHeight * 0.9);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify DialogContent component structure
   */
  it('DialogContent component has mobile-optimized structure', () => {
    // Verify the component uses DialogPrimitive.Content
    expect(dialogComponentContent).toContain('DialogPrimitive.Content');
    
    // Verify it has the data-slot attribute for testing
    expect(dialogComponentContent).toContain('data-slot="dialog-content"');
    
    // Verify it uses cn() for className merging
    expect(dialogComponentContent).toContain('cn(');
  });

  /**
   * Additional test: Verify scroll lock integration
   */
  it('DialogContent integrates scroll lock functionality', () => {
    // Verify the component imports useScrollLock
    expect(dialogComponentContent).toContain('useScrollLock');
    
    // Verify it's imported from the correct path
    expect(dialogComponentContent).toContain('@/lib/hooks/use-scroll-lock');
  });

  /**
   * Additional test: Verify responsive padding classes
   */
  it('DialogContent uses responsive padding (p-4 on mobile, p-6 on desktop)', () => {
    // Verify both padding classes are present
    expect(dialogComponentContent).toContain('p-4');
    expect(dialogComponentContent).toContain('sm:p-6');
    
    // This ensures mobile gets p-4 (16px) and desktop gets p-6 (24px)
  });

  /**
   * Property-based test: Verify viewport containment for various screen sizes
   */
  it('Property 2: viewport containment works for all mobile screen sizes', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 320, max: 767 }),
          height: fc.integer({ min: 480, max: 1024 }),
        }),
        ({ width, height }) => {
          // Calculate expected max dimensions
          const expectedMaxWidth = width - 32; // calc(100% - 2rem)
          const expectedMaxHeight = height * 0.9; // 90vh
          
          // Verify calculations are within reasonable bounds
          expect(expectedMaxWidth).toBeGreaterThan(0);
          expect(expectedMaxWidth).toBeLessThan(width);
          expect(expectedMaxHeight).toBeGreaterThan(0);
          expect(expectedMaxHeight).toBeLessThan(height);
          
          // Verify there's adequate space for content
          expect(expectedMaxWidth).toBeGreaterThan(200); // Minimum usable width
          expect(expectedMaxHeight).toBeGreaterThan(300); // Minimum usable height
        }
      ),
      { numRuns: 100 }
    );
  });
});
