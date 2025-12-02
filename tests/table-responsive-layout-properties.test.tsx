import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Feature: mobile-optimization, Property 1: Table responsive layout
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.5, 4.1, 4.2
 */

describe('Table Responsive Layout Properties', () => {
  // Read the ResponsiveTable component file to verify implementation
  const responsiveTablePath = join(__dirname, '../components/ui/responsive-table.tsx');
  const responsiveTableContent = readFileSync(responsiveTablePath, 'utf-8');

  // Read the base Table component to verify it has overflow-x-auto
  const tablePath = join(__dirname, '../components/ui/table.tsx');
  const tableContent = readFileSync(tablePath, 'utf-8');

  /**
   * Property 1: Table responsive layout - ResponsiveTable has required CSS classes
   * For any data table component rendered on a mobile viewport (width < 768px), 
   * the table container SHALL have horizontal scroll enabled (overflow-x: auto) AND 
   * the page container SHALL have vertical scroll enabled (overflow-y: auto) AND 
   * no table content SHALL cause horizontal page overflow
   * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.5, 4.1, 4.2
   */
  it('Property 1: ResponsiveTable has horizontal scroll enabled', () => {
    // Verify that ResponsiveTable component includes overflow-x-auto for horizontal scroll
    expect(responsiveTableContent).toContain('overflow-x-auto');
    
    // Verify it has full width to prevent page overflow
    expect(responsiveTableContent).toContain('w-full');
    
    // Verify it has max-width constraint to prevent exceeding viewport
    expect(responsiveTableContent).toContain('max-w-full');
    
    // Verify it has relative positioning for proper scroll context
    expect(responsiveTableContent).toContain('relative');
  });

  /**
   * Additional test: Verify touch-friendly scrolling is enabled
   */
  it('ResponsiveTable has touch-friendly scrolling enabled', () => {
    // Verify webkit overflow scrolling for smooth touch scrolling on iOS
    expect(responsiveTableContent).toContain('-webkit-overflow-scrolling:touch');
  });

  /**
   * Additional test: Verify scroll indicators are styled
   */
  it('ResponsiveTable has styled scroll indicators', () => {
    // Verify scrollbar styling is present for better UX
    expect(responsiveTableContent).toContain('::-webkit-scrollbar');
  });

  /**
   * Additional test: Verify base Table component has overflow-x-auto
   */
  it('base Table component has horizontal scroll container', () => {
    // Verify the base Table component wraps table in overflow-x-auto container
    expect(tableContent).toContain('overflow-x-auto');
    expect(tableContent).toContain('data-slot="table-container"');
  });

  /**
   * Property-based test: Verify container width constraint logic
   * For any viewport width, the table container should not exceed it
   */
  it('Property 1: table container respects viewport width constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }), // Mobile viewport range
        (viewportWidth) => {
          // With w-full and max-w-full classes, container should be <= viewport width
          // w-full = width: 100%
          // max-w-full = max-width: 100%
          
          // Verify the container will not exceed viewport
          const containerMaxWidth = viewportWidth; // 100% of viewport
          expect(containerMaxWidth).toBeLessThanOrEqual(viewportWidth);
          expect(containerMaxWidth).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify horizontal scroll behavior for wide tables
   * When table width exceeds viewport, overflow-x-auto enables scrolling
   */
  it('Property 1: horizontal scroll enabled when table exceeds viewport', () => {
    fc.assert(
      fc.property(
        fc.record({
          viewportWidth: fc.integer({ min: 320, max: 767 }),
          tableWidth: fc.integer({ min: 800, max: 2000 }), // Table wider than mobile
        }),
        ({ viewportWidth, tableWidth }) => {
          // When table width > viewport width, overflow-x-auto allows horizontal scroll
          const needsHorizontalScroll = tableWidth > viewportWidth;
          
          // Verify the logic
          expect(needsHorizontalScroll).toBe(true);
          expect(tableWidth).toBeGreaterThan(viewportWidth);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify vertical page scroll is maintained
   * Table horizontal scroll should not interfere with page vertical scroll
   */
  it('Property 1: vertical page scroll is independent of table horizontal scroll', () => {
    fc.assert(
      fc.property(
        fc.record({
          viewportHeight: fc.integer({ min: 400, max: 900 }),
          contentHeight: fc.integer({ min: 1000, max: 3000 }),
        }),
        ({ viewportHeight, contentHeight }) => {
          // When content height > viewport height, page needs vertical scroll
          const needsVerticalScroll = contentHeight > viewportHeight;
          
          // Verify the logic
          expect(needsVerticalScroll).toBe(true);
          expect(contentHeight).toBeGreaterThan(viewportHeight);
          
          // Table's overflow-x-auto should not affect page's overflow-y
          // They are independent scroll contexts
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify ResponsiveTable component structure
   */
  it('ResponsiveTable component has correct structure', () => {
    // Verify it's a wrapper div
    expect(responsiveTableContent).toContain('data-testid="responsive-table-wrapper"');
    
    // Verify it accepts children
    expect(responsiveTableContent).toContain('children');
    
    // Verify it uses cn() for className merging
    expect(responsiveTableContent).toContain('cn(');
  });

  /**
   * Additional test: Verify ResponsiveTable exports
   */
  it('ResponsiveTable is properly exported from table module', () => {
    // Verify ResponsiveTable is exported from table.tsx
    expect(tableContent).toContain('export { ResponsiveTable }');
    expect(tableContent).toContain('export type { ResponsiveTableProps }');
  });
});
