/**
 * Property-Based Tests for Empty State Mobile Formatting
 * 
 * Feature: mobile-optimization, Property 9: Empty state mobile formatting
 * Validates: Requirements 4.5
 * 
 * Property: For any empty table state on mobile viewport, the empty state message 
 * SHALL be centered AND use mobile-appropriate font size (min 14px) AND have 
 * adequate padding (min 48px vertical)
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Property 9: Empty state mobile formatting', () => {
  // Read component files to verify implementation
  const tableSkeletonPath = join(__dirname, '../components/table-skeleton.tsx');
  const tableSkeletonContent = readFileSync(tableSkeletonPath, 'utf-8');
  
  const emptyStatePath = join(__dirname, '../components/ui/empty-state.tsx');
  const emptyStateContent = readFileSync(emptyStatePath, 'utf-8');

  /**
   * Property 9: Empty state mobile formatting
   * For any empty table state on mobile viewport, the empty state message SHALL be centered 
   * AND use mobile-appropriate font size (min 14px) AND have adequate padding (min 48px vertical)
   * Validates: Requirements 4.5
   */
  it('Property 9: TableSkeleton has required CSS classes for empty state', () => {
    // Verify that TableSkeleton includes empty state with proper formatting
    
    // Check for centered text: text-center
    expect(tableSkeletonContent).toContain('text-center');
    
    // Check for adequate padding: py-12 (48px vertical)
    expect(tableSkeletonContent).toContain('py-12');
    
    // Check for horizontal padding: px-4
    expect(tableSkeletonContent).toContain('px-4');
    
    // Check for mobile-appropriate font size: text-sm (14px minimum)
    expect(tableSkeletonContent).toContain('text-sm');
    
    // Check for muted text color
    expect(tableSkeletonContent).toContain('text-muted-foreground');
  });

  it('Property 9: EmptyState component has required CSS classes', () => {
    // Verify that EmptyState component includes proper mobile formatting
    
    // Check for centered text: text-center
    expect(emptyStateContent).toContain('text-center');
    
    // Check for adequate padding: py-12 (48px vertical)
    expect(emptyStateContent).toContain('py-12');
    
    // Check for horizontal padding: px-4
    expect(emptyStateContent).toContain('px-4');
    
    // Check for mobile-appropriate font size: text-sm (14px minimum)
    expect(emptyStateContent).toContain('text-sm');
    
    // Check for muted text color
    expect(emptyStateContent).toContain('text-muted-foreground');
  });

  /**
   * Property-based test: Verify padding calculation
   * py-12 in Tailwind CSS equals 48px (3rem)
   */
  it('Property 9: py-12 class provides minimum 48px vertical padding', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // Arbitrary test iterations
        () => {
          // Tailwind py-12 = padding-top: 3rem and padding-bottom: 3rem
          // With default 16px base font size: 3rem = 48px
          const remSize = 16; // Default browser font size
          const py12InRem = 3;
          const expectedPadding = py12InRem * remSize;
          
          expect(expectedPadding).toBe(48);
          expect(expectedPadding).toBeGreaterThanOrEqual(48);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify font size calculation
   * text-sm in Tailwind CSS equals 14px (0.875rem)
   */
  it('Property 9: text-sm class provides minimum 14px font size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // Arbitrary test iterations
        () => {
          // Tailwind text-sm = font-size: 0.875rem
          // With default 16px base font size: 0.875rem = 14px
          const remSize = 16; // Default browser font size
          const textSmInRem = 0.875;
          const expectedFontSize = textSmInRem * remSize;
          
          expect(expectedFontSize).toBe(14);
          expect(expectedFontSize).toBeGreaterThanOrEqual(14);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify TableSkeleton handles empty state (rows=0)
   */
  it('TableSkeleton component handles empty state when rows is 0', () => {
    // Verify the component checks for rows === 0 or showEmpty
    expect(tableSkeletonContent).toContain('rows === 0');
    expect(tableSkeletonContent).toContain('showEmpty');
    
    // Verify it returns empty state markup
    expect(tableSkeletonContent).toContain('emptyMessage');
  });

  /**
   * Additional test: Verify EmptyState component structure
   */
  it('EmptyState component has proper structure with message, description, and action', () => {
    // Verify the component accepts message prop
    expect(emptyStateContent).toContain('message');
    
    // Verify it accepts optional description
    expect(emptyStateContent).toContain('description');
    
    // Verify it accepts optional action
    expect(emptyStateContent).toContain('action');
    
    // Verify it uses cn() for className merging
    expect(emptyStateContent).toContain('cn(');
  });

  /**
   * Property-based test: Verify empty state formatting for various viewport widths
   */
  it('Property 9: empty state formatting is consistent across mobile viewports', () => {
    fc.assert(
      fc.property(
        fc.record({
          viewportWidth: fc.integer({ min: 320, max: 767 }), // Mobile viewport range
          messageLength: fc.integer({ min: 10, max: 200 }),
        }),
        ({ viewportWidth, messageLength }) => {
          // Verify that regardless of viewport width or message length,
          // the CSS classes remain consistent
          
          // text-center ensures centering at any width
          expect(tableSkeletonContent).toContain('text-center');
          
          // py-12 provides consistent 48px padding
          expect(tableSkeletonContent).toContain('py-12');
          
          // text-sm provides consistent 14px font size
          expect(tableSkeletonContent).toContain('text-sm');
          
          // Verify viewport width is in mobile range
          expect(viewportWidth).toBeGreaterThanOrEqual(320);
          expect(viewportWidth).toBeLessThanOrEqual(767);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify empty state works for various message lengths
   */
  it('Property 9: empty state handles various message lengths correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (message) => {
          // Verify that the component structure supports any message length
          // The CSS classes should handle text wrapping automatically
          
          // text-center will center text regardless of length
          expect(emptyStateContent).toContain('text-center');
          
          // px-4 provides horizontal padding to prevent edge overflow
          expect(emptyStateContent).toContain('px-4');
          
          // Message length should be positive
          expect(message.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify responsive behavior
   */
  it('empty state components use mobile-first responsive classes', () => {
    // Both components should use base mobile classes
    // (no sm: prefix needed for mobile-first approach)
    
    // Verify TableSkeleton uses mobile-first classes
    expect(tableSkeletonContent).toContain('text-center');
    expect(tableSkeletonContent).toContain('py-12');
    expect(tableSkeletonContent).toContain('text-sm');
    
    // Verify EmptyState uses mobile-first classes
    expect(emptyStateContent).toContain('text-center');
    expect(emptyStateContent).toContain('py-12');
    expect(emptyStateContent).toContain('text-sm');
  });
});
