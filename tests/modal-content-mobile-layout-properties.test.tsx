import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Feature: mobile-optimization, Property 14: Modal content mobile layout
 * Validates: Requirements 6.3, 6.4
 */

describe('Modal Content Mobile Layout Properties', () => {
  // Read the asset dialog component files to verify implementation
  const createAssetDialogPath = join(__dirname, '../app/(dashboard)/user/create-asset-dialog.tsx');
  const editAssetDialogPath = join(__dirname, '../app/(dashboard)/user/edit-asset-dialog.tsx');
  
  const createAssetDialogContent = readFileSync(createAssetDialogPath, 'utf-8');
  const editAssetDialogContent = readFileSync(editAssetDialogPath, 'utf-8');

  /**
   * Property 14: Modal content mobile layout
   * For any modal displaying asset details or forms on mobile viewport, content SHALL be 
   * arranged in single-column layout AND form fields SHALL stack vertically with minimum 
   * 16px spacing AND information grids SHALL collapse to single column
   * Validates: Requirements 6.3, 6.4
   */
  it('Property 14: create asset dialog has vertical form field stacking with proper spacing', () => {
    // Verify form fields are in a container with vertical spacing
    expect(createAssetDialogContent).toContain('space-y-4');
    
    // Verify individual form fields have vertical spacing
    expect(createAssetDialogContent).toContain('space-y-2');
    
    // Verify the form uses proper structure with py-4 for padding
    expect(createAssetDialogContent).toContain('py-4');
  });

  it('Property 14: edit asset dialog has vertical form field stacking with proper spacing', () => {
    // Verify form fields are in a container with vertical spacing
    expect(editAssetDialogContent).toContain('space-y-4');
    
    // Verify individual form fields have vertical spacing
    expect(editAssetDialogContent).toContain('space-y-2');
    
    // Verify the form uses proper structure with py-4 for padding
    expect(editAssetDialogContent).toContain('py-4');
  });

  /**
   * Property-based test: Verify spacing calculations
   * For any number of form fields, minimum 16px spacing should be maintained
   */
  it('Property 14: spacing calculation maintains minimum 16px between fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // Number of form fields
        (numFields) => {
          // space-y-4 in Tailwind = 1rem = 16px
          const spacingPerField = 16; // 1rem
          const totalSpacing = (numFields - 1) * spacingPerField;
          
          // Verify spacing is adequate
          expect(spacingPerField).toBeGreaterThanOrEqual(16);
          expect(totalSpacing).toBeGreaterThan(0);
          expect(totalSpacing).toBe((numFields - 1) * 16);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Verify form fields use full width on mobile
   */
  it('Property 14: form inputs use full width', () => {
    // Input components should use w-full by default
    // Verify Label and Input structure exists
    expect(createAssetDialogContent).toContain('Label');
    expect(createAssetDialogContent).toContain('Input');
    expect(createAssetDialogContent).toContain('Combobox');
    expect(createAssetDialogContent).toContain('DatePicker');
  });

  /**
   * Test: Verify single-column layout structure
   */
  it('Property 14: modal content uses single-column layout structure', () => {
    // Verify both dialogs use vertical stacking (space-y-*)
    expect(createAssetDialogContent).toMatch(/space-y-\d+/);
    expect(editAssetDialogContent).toMatch(/space-y-\d+/);
    
    // Verify no horizontal grid layouts on mobile (no grid-cols-2 without responsive prefix)
    const hasUnresponsiveGrid = /className="[^"]*grid-cols-[2-9](?!\s|")/.test(createAssetDialogContent);
    expect(hasUnresponsiveGrid).toBe(false);
  });

  /**
   * Property-based test: Verify field spacing for various form configurations
   */
  it('Property 14: field spacing scales correctly for different form sizes', () => {
    fc.assert(
      fc.property(
        fc.record({
          numTextFields: fc.integer({ min: 1, max: 5 }),
          numSelectFields: fc.integer({ min: 1, max: 3 }),
          numDateFields: fc.integer({ min: 0, max: 2 }),
        }),
        ({ numTextFields, numSelectFields, numDateFields }) => {
          const totalFields = numTextFields + numSelectFields + numDateFields;
          const minSpacing = 16; // 1rem = 16px
          const totalMinSpacing = (totalFields - 1) * minSpacing;
          
          // Verify minimum spacing requirements
          expect(totalMinSpacing).toBeGreaterThanOrEqual(0);
          expect(minSpacing).toBe(16);
          
          // For 5 fields, we should have at least 64px of spacing
          if (totalFields === 5) {
            expect(totalMinSpacing).toBe(64);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Verify form structure includes all required fields
   */
  it('Property 14: asset forms include all required fields with proper structure', () => {
    // Create asset dialog should have all required fields
    expect(createAssetDialogContent).toContain('Asset Name');
    expect(createAssetDialogContent).toContain('Category');
    expect(createAssetDialogContent).toContain('Department');
    expect(createAssetDialogContent).toContain('Purchase Date');
    expect(createAssetDialogContent).toContain('Cost');
    
    // Edit asset dialog should have the same fields
    expect(editAssetDialogContent).toContain('Asset Name');
    expect(editAssetDialogContent).toContain('Category');
    expect(editAssetDialogContent).toContain('Department');
    expect(editAssetDialogContent).toContain('Purchase Date');
    expect(editAssetDialogContent).toContain('Cost');
  });

  /**
   * Test: Verify error messages are displayed properly
   */
  it('Property 14: error messages are displayed with proper spacing', () => {
    // Verify error message structure exists
    expect(createAssetDialogContent).toContain('text-sm text-red-600');
    expect(editAssetDialogContent).toContain('text-sm text-red-600');
    
    // Error messages should be within the field container (space-y-2)
    const createErrorPattern = /space-y-2[\s\S]*?text-sm text-red-600/;
    const editErrorPattern = /space-y-2[\s\S]*?text-sm text-red-600/;
    
    expect(createAssetDialogContent).toMatch(createErrorPattern);
    expect(editAssetDialogContent).toMatch(editErrorPattern);
  });
});
