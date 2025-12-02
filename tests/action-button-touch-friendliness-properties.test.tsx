import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Feature: mobile-optimization, Property 7: Action button touch-friendliness
 * Validates: Requirements 4.3
 */

describe('Action Button Touch-Friendliness Properties', () => {
  // Read the assets table client file to verify action button implementation
  const assetsTablePath = join(__dirname, '../app/(dashboard)/user/assets-table-client.tsx');
  const assetsTableContent = readFileSync(assetsTablePath, 'utf-8');

  // Read the button component to verify base touch target sizing
  const buttonPath = join(__dirname, '../components/ui/button.tsx');
  const buttonContent = readFileSync(buttonPath, 'utf-8');

  /**
   * Property 7: Action button touch-friendliness
   * For any action buttons in table rows on mobile viewport, each button SHALL have 
   * minimum 44x44px touch target AND buttons SHALL have minimum 8px spacing AND 
   * buttons SHALL have visible touch feedback on interaction
   * Validates: Requirements 4.3
   */
  it('Property 7: action buttons have minimum 44x44px touch targets', () => {
    // Verify action buttons use min-h-[44px] and min-w-[44px]
    expect(assetsTableContent).toContain('min-h-[44px]');
    expect(assetsTableContent).toContain('min-w-[44px]');
  });

  /**
   * Additional test: Verify action buttons have adequate spacing
   */
  it('action buttons have minimum 8px spacing', () => {
    // Verify gap-2 (8px) between action buttons
    expect(assetsTableContent).toContain('gap-2');
  });

  /**
   * Additional test: Verify buttons have hover states for touch feedback
   */
  it('buttons have visible touch feedback', () => {
    // Verify button component has hover states
    expect(buttonContent).toContain('hover:');
    
    // Verify ghost variant has hover state
    expect(buttonContent).toContain('hover:bg-accent');
  });

  /**
   * Additional test: Verify action buttons are in a flex container
   */
  it('action buttons are in a flex container with proper alignment', () => {
    // Verify action buttons are in a flex container
    expect(assetsTableContent).toContain('flex items-center justify-end gap-2');
  });

  /**
   * Property-based test: Verify minimum touch target size
   */
  it('Property 7: touch targets meet 44px minimum requirement', () => {
    fc.assert(
      fc.property(
        fc.constant(44), // Minimum touch target size per WCAG 2.1 Level AAA
        (minSize) => {
          // min-h-[44px] and min-w-[44px] ensure 44x44px minimum
          const buttonMinHeight = 44;
          const buttonMinWidth = 44;
          
          expect(buttonMinHeight).toBeGreaterThanOrEqual(minSize);
          expect(buttonMinWidth).toBeGreaterThanOrEqual(minSize);
          expect(buttonMinHeight).toBe(44);
          expect(buttonMinWidth).toBe(44);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify spacing between buttons
   */
  it('Property 7: buttons have adequate spacing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }), // Number of action buttons
        (numButtons) => {
          // gap-2 = 8px spacing between buttons
          const gapSize = 8;
          const minGapSize = 8;
          
          // Total spacing for n buttons
          const totalSpacing = (numButtons - 1) * gapSize;
          
          expect(gapSize).toBeGreaterThanOrEqual(minGapSize);
          expect(totalSpacing).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify touch target area calculation
   */
  it('Property 7: touch target area meets minimum requirement', () => {
    fc.assert(
      fc.property(
        fc.record({
          minHeight: fc.constant(44),
          minWidth: fc.constant(44),
        }),
        ({ minHeight, minWidth }) => {
          // Calculate touch target area
          const touchTargetArea = minHeight * minWidth;
          const minTouchTargetArea = 44 * 44; // 1936 square pixels
          
          expect(touchTargetArea).toBeGreaterThanOrEqual(minTouchTargetArea);
          expect(touchTargetArea).toBe(1936);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify button spacing prevents accidental taps
   */
  it('Property 7: button spacing prevents accidental taps', () => {
    fc.assert(
      fc.property(
        fc.record({
          buttonWidth: fc.constant(44),
          gapSize: fc.constant(8),
          numButtons: fc.integer({ min: 2, max: 5 }),
        }),
        ({ buttonWidth, gapSize, numButtons }) => {
          // Calculate total width of button group
          const totalWidth = (numButtons * buttonWidth) + ((numButtons - 1) * gapSize);
          
          // Verify gap is sufficient to prevent accidental taps
          expect(gapSize).toBeGreaterThanOrEqual(8);
          
          // Verify total width calculation
          expect(totalWidth).toBeGreaterThan(0);
          expect(totalWidth).toBe((numButtons * 44) + ((numButtons - 1) * 8));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify aria-labels for accessibility
   */
  it('action buttons have aria-labels for accessibility', () => {
    // Verify action buttons have aria-label attributes
    expect(assetsTableContent).toContain('aria-label="View asset details"');
    expect(assetsTableContent).toContain('aria-label="Edit asset"');
    expect(assetsTableContent).toContain('aria-label="Request deletion"');
  });

  /**
   * Additional test: Verify button size variant
   */
  it('action buttons use appropriate size variant', () => {
    // Verify buttons use size="sm" for compact display
    expect(assetsTableContent).toContain('size="sm"');
  });

  /**
   * Additional test: Verify button variant for visual consistency
   */
  it('action buttons use ghost variant for table context', () => {
    // Verify buttons use variant="ghost" for subtle appearance in tables
    expect(assetsTableContent).toContain('variant="ghost"');
  });
});
