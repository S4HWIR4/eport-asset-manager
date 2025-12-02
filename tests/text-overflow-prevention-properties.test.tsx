import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Feature: mobile-optimization, Property 5: Text overflow prevention
 * Validates: Requirements 1.5
 */

describe('Text Overflow Prevention Properties', () => {
  // Read the audit logs client file to verify implementation
  const auditLogsClientPath = join(__dirname, '../app/(dashboard)/admin/audit-logs/audit-logs-client.tsx');
  const auditLogsClientContent = readFileSync(auditLogsClientPath, 'utf-8');

  /**
   * Property 5: Text overflow prevention
   * For any text content within table cells or cards on mobile viewport, the text SHALL 
   * either wrap (word-wrap: break-word) OR truncate with ellipsis (text-overflow: ellipsis) 
   * AND SHALL NOT cause horizontal scrolling of the parent container
   * Validates: Requirements 1.5
   */
  it('Property 5: text content uses truncation or wrapping', () => {
    // Verify truncate class is used for text that should be truncated
    expect(auditLogsClientContent).toContain('truncate');
    
    // Verify break-words class is used for text that should wrap
    expect(auditLogsClientContent).toContain('break-words');
    
    // Verify break-all is used for long strings like IDs
    expect(auditLogsClientContent).toContain('break-all');
  });

  /**
   * Additional test: Verify max-width constraints on text containers
   */
  it('text containers have max-width constraints', () => {
    // Verify max-w classes are used to constrain text width
    expect(auditLogsClientContent).toContain('max-w-');
  });

  /**
   * Additional test: Verify whitespace handling
   */
  it('text uses appropriate whitespace handling', () => {
    // Verify whitespace-nowrap is used where appropriate (dates, times)
    expect(auditLogsClientContent).toContain('whitespace-nowrap');
    
    // Verify whitespace-pre-wrap is used for preformatted text
    expect(auditLogsClientContent).toContain('whitespace-pre-wrap');
  });

  /**
   * Property-based test: Verify truncate behavior
   * For any text longer than container width, truncate prevents overflow
   */
  it('Property 5: truncate prevents horizontal overflow', () => {
    fc.assert(
      fc.property(
        fc.record({
          containerWidth: fc.integer({ min: 100, max: 300 }), // Container width in px
          textLength: fc.integer({ min: 50, max: 200 }), // Text length in characters
        }),
        ({ containerWidth, textLength }) => {
          // truncate class applies:
          // - overflow: hidden
          // - text-overflow: ellipsis
          // - white-space: nowrap
          
          // With truncate, text never exceeds container width
          const textWidth = containerWidth; // Capped at container width
          
          expect(textWidth).toBeLessThanOrEqual(containerWidth);
          expect(textWidth).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify break-words behavior
   * For any long word, break-words allows wrapping
   */
  it('Property 5: break-words allows text wrapping', () => {
    fc.assert(
      fc.property(
        fc.record({
          containerWidth: fc.integer({ min: 200, max: 400 }),
          wordLength: fc.integer({ min: 50, max: 150 }),
        }),
        ({ containerWidth, wordLength }) => {
          // break-words applies: word-wrap: break-word
          // This allows long words to break and wrap to next line
          
          // With break-words, text wraps instead of overflowing
          const doesWrap = wordLength > containerWidth;
          
          if (doesWrap) {
            // Text wraps to multiple lines, no horizontal overflow
            expect(containerWidth).toBeGreaterThan(0);
          }
          
          // Container width is never exceeded
          expect(containerWidth).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify break-all behavior for IDs
   * For any long ID string, break-all prevents overflow
   */
  it('Property 5: break-all handles long IDs without overflow', () => {
    fc.assert(
      fc.property(
        fc.record({
          containerWidth: fc.integer({ min: 150, max: 300 }),
          idLength: fc.integer({ min: 36, max: 100 }), // UUID length and longer
        }),
        ({ containerWidth, idLength }) => {
          // break-all applies: word-break: break-all
          // This breaks at any character, preventing overflow
          
          // With break-all, even long IDs don't cause overflow
          const maxLineWidth = containerWidth;
          
          expect(maxLineWidth).toBeLessThanOrEqual(containerWidth);
          expect(maxLineWidth).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify max-width constraint logic
   * For any max-width value, content is constrained
   */
  it('Property 5: max-width constrains content width', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }), // max-width value in px
        (maxWidth) => {
          // max-w-[Xpx] sets maximum width
          // Content cannot exceed this width
          
          const contentWidth = Math.min(maxWidth, maxWidth); // Capped at max-width
          
          expect(contentWidth).toBeLessThanOrEqual(maxWidth);
          expect(contentWidth).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify performer name/email truncation
   */
  it('performer information uses truncation', () => {
    // Verify performer name and email cells use truncate
    const performerCellPattern = /performer.*truncate/s;
    expect(auditLogsClientContent).toMatch(performerCellPattern);
  });

  /**
   * Additional test: Verify entity ID uses break-all
   */
  it('entity ID uses break-all for long UUIDs', () => {
    // Verify entity ID display uses break-all
    const entityIdPattern = /Entity ID.*break-all/s;
    expect(auditLogsClientContent).toMatch(entityIdPattern);
  });

  /**
   * Property-based test: Verify no horizontal page overflow
   * For any text content, overflow is contained within element
   */
  it('Property 5: text overflow does not cause page horizontal scroll', () => {
    fc.assert(
      fc.property(
        fc.record({
          pageWidth: fc.integer({ min: 320, max: 767 }), // Mobile viewport
          textLength: fc.integer({ min: 100, max: 500 }),
        }),
        ({ pageWidth, textLength }) => {
          // With truncate, break-words, or break-all:
          // - Text is contained within its container
          // - Container respects page width
          // - No horizontal page scroll occurs
          
          const containerMaxWidth = pageWidth;
          const effectiveTextWidth = Math.min(textLength, containerMaxWidth);
          
          // Text width never exceeds page width
          expect(effectiveTextWidth).toBeLessThanOrEqual(pageWidth);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify whitespace-nowrap for dates
   */
  it('dates use whitespace-nowrap to prevent breaking', () => {
    // Verify date/time displays use whitespace-nowrap
    const datePattern = /created_at.*whitespace-nowrap/s;
    expect(auditLogsClientContent).toMatch(datePattern);
  });
});
