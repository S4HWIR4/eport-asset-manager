import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Feature: mobile-optimization, Property 17: Mobile font sizing
 * Validates: Requirements 7.4
 */

describe('Mobile Font Sizing Properties', () => {
  // Read the globals.css file to verify mobile font sizing utilities
  const globalsPath = join(__dirname, '../app/globals.css');
  const globalsContent = readFileSync(globalsPath, 'utf-8');

  /**
   * Property 17: Mobile font sizing
   * For any text content on mobile viewport, body text SHALL have minimum 14px font size AND
   * headings SHALL scale appropriately (h1: min 24px, h2: min 20px, h3: min 18px) AND
   * line height SHALL be at least 1.5 for readability
   * Validates: Requirements 7.4
   */
  it('Property 17: globals.css contains mobile font sizing utilities', () => {
    // Verify mobile font size utilities exist
    expect(globalsContent).toContain('.text-mobile-base');
    expect(globalsContent).toContain('.text-mobile-sm');
    expect(globalsContent).toContain('.text-mobile-lg');
    
    // Verify heading utilities exist
    expect(globalsContent).toContain('.heading-mobile-h1');
    expect(globalsContent).toContain('.heading-mobile-h2');
    expect(globalsContent).toContain('.heading-mobile-h3');
    expect(globalsContent).toContain('.heading-mobile-h4');
    
    // Verify line height utilities exist
    expect(globalsContent).toContain('.mobile-leading-relaxed');
    expect(globalsContent).toContain('.mobile-leading-loose');
  });

  /**
   * Property-based test: Verify minimum font sizes for body text
   */
  it('Property 17: body text minimum font size is 14px', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('text-mobile-base', 'text-mobile-sm', 'text-mobile-lg'),
        (className) => {
          // Verify the class exists in globals.css
          expect(globalsContent).toContain(`.${className}`);
          
          // For text-mobile-base, verify it uses clamp with 14px minimum
          if (className === 'text-mobile-base') {
            const classSection = globalsContent.substring(
              globalsContent.indexOf(`.${className}`),
              globalsContent.indexOf('}', globalsContent.indexOf(`.${className}`))
            );
            expect(classSection).toContain('clamp(14px');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify heading minimum font sizes
   */
  it('Property 17: headings have appropriate minimum sizes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { heading: 'h1', minSize: 24 },
          { heading: 'h2', minSize: 20 },
          { heading: 'h3', minSize: 18 },
          { heading: 'h4', minSize: 16 }
        ),
        ({ heading, minSize }) => {
          const className = `.heading-mobile-${heading}`;
          
          // Verify the class exists
          expect(globalsContent).toContain(className);
          
          // Extract the class definition
          const classStart = globalsContent.indexOf(className);
          const classEnd = globalsContent.indexOf('}', classStart);
          const classSection = globalsContent.substring(classStart, classEnd);
          
          // Verify it uses clamp with appropriate minimum
          expect(classSection).toContain('clamp(');
          expect(classSection).toContain(`${minSize}px`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Verify h1 minimum size is 24px
   */
  it('Property 17: h1 has minimum 24px font size', () => {
    const h1Section = globalsContent.substring(
      globalsContent.indexOf('.heading-mobile-h1'),
      globalsContent.indexOf('}', globalsContent.indexOf('.heading-mobile-h1'))
    );
    
    expect(h1Section).toContain('clamp(24px');
  });

  /**
   * Test: Verify h2 minimum size is 20px
   */
  it('Property 17: h2 has minimum 20px font size', () => {
    const h2Section = globalsContent.substring(
      globalsContent.indexOf('.heading-mobile-h2'),
      globalsContent.indexOf('}', globalsContent.indexOf('.heading-mobile-h2'))
    );
    
    expect(h2Section).toContain('clamp(20px');
  });

  /**
   * Test: Verify h3 minimum size is 18px
   */
  it('Property 17: h3 has minimum 18px font size', () => {
    const h3Section = globalsContent.substring(
      globalsContent.indexOf('.heading-mobile-h3'),
      globalsContent.indexOf('}', globalsContent.indexOf('.heading-mobile-h3'))
    );
    
    expect(h3Section).toContain('clamp(18px');
  });

  /**
   * Test: Verify h4 minimum size is 16px
   */
  it('Property 17: h4 has minimum 16px font size', () => {
    const h4Section = globalsContent.substring(
      globalsContent.indexOf('.heading-mobile-h4'),
      globalsContent.indexOf('}', globalsContent.indexOf('.heading-mobile-h4'))
    );
    
    expect(h4Section).toContain('clamp(16px');
  });

  /**
   * Property-based test: Verify line height is at least 1.5
   */
  it('Property 17: line height is at least 1.5 for readability', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('mobile-leading-relaxed', 'mobile-leading-loose'),
        (className) => {
          // Verify the class exists
          expect(globalsContent).toContain(`.${className}`);
          
          // Extract the class definition
          const classStart = globalsContent.indexOf(`.${className}`);
          const classEnd = globalsContent.indexOf('}', classStart);
          const classSection = globalsContent.substring(classStart, classEnd);
          
          // Verify line-height property exists
          expect(classSection).toContain('line-height');
          
          // For relaxed, should be 1.5
          if (className === 'mobile-leading-relaxed') {
            expect(classSection).toContain('1.5');
          }
          
          // For loose, should be 1.75
          if (className === 'mobile-leading-loose') {
            expect(classSection).toContain('1.75');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify heading line heights
   */
  it('Property 17: headings have appropriate line heights', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('heading-mobile-h1', 'heading-mobile-h2', 'heading-mobile-h3', 'heading-mobile-h4'),
        (className) => {
          // Verify the class exists
          expect(globalsContent).toContain(`.${className}`);
          
          // Extract the class definition
          const classStart = globalsContent.indexOf(`.${className}`);
          const classEnd = globalsContent.indexOf('}', classStart);
          const classSection = globalsContent.substring(classStart, classEnd);
          
          // Verify line-height property exists
          expect(classSection).toContain('line-height');
          
          // Extract line-height value
          const lineHeightMatch = classSection.match(/line-height:\s*([\d.]+)/);
          if (lineHeightMatch) {
            const lineHeight = parseFloat(lineHeightMatch[1]);
            
            // Headings should have line height between 1.2 and 1.5
            expect(lineHeight).toBeGreaterThanOrEqual(1.2);
            expect(lineHeight).toBeLessThanOrEqual(1.5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Verify font size hierarchy
   */
  it('Property 17: heading sizes maintain proper hierarchy', () => {
    // Extract minimum sizes from clamp functions
    const h1Match = globalsContent.match(/\.heading-mobile-h1[\s\S]*?clamp\((\d+)px/);
    const h2Match = globalsContent.match(/\.heading-mobile-h2[\s\S]*?clamp\((\d+)px/);
    const h3Match = globalsContent.match(/\.heading-mobile-h3[\s\S]*?clamp\((\d+)px/);
    const h4Match = globalsContent.match(/\.heading-mobile-h4[\s\S]*?clamp\((\d+)px/);
    
    if (h1Match && h2Match && h3Match && h4Match) {
      const h1Size = parseInt(h1Match[1]);
      const h2Size = parseInt(h2Match[1]);
      const h3Size = parseInt(h3Match[1]);
      const h4Size = parseInt(h4Match[1]);
      
      // Verify hierarchy: h1 >= h2 >= h3 >= h4
      expect(h1Size).toBeGreaterThanOrEqual(h2Size);
      expect(h2Size).toBeGreaterThanOrEqual(h3Size);
      expect(h3Size).toBeGreaterThanOrEqual(h4Size);
      
      // Verify minimum sizes
      expect(h1Size).toBeGreaterThanOrEqual(24);
      expect(h2Size).toBeGreaterThanOrEqual(20);
      expect(h3Size).toBeGreaterThanOrEqual(18);
      expect(h4Size).toBeGreaterThanOrEqual(16);
    }
  });

  /**
   * Property-based test: Verify responsive text utilities
   */
  it('Property 17: mobile text utilities are defined', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('text-mobile-xs', 'text-mobile-sm', 'text-mobile-base', 'text-mobile-lg', 'text-mobile-xl'),
        (className) => {
          // Verify the class exists in globals.css
          expect(globalsContent).toContain(`.${className}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test: Verify touch target utilities are defined
   */
  it('touch target sizing utilities are defined', () => {
    expect(globalsContent).toContain('.touch-target-sm');
    expect(globalsContent).toContain('.touch-target-md');
    expect(globalsContent).toContain('.touch-target-lg');
    
    // Verify minimum sizes
    const touchTargetSmSection = globalsContent.substring(
      globalsContent.indexOf('.touch-target-sm'),
      globalsContent.indexOf('}', globalsContent.indexOf('.touch-target-sm'))
    );
    
    expect(touchTargetSmSection).toContain('min-width: 44px');
    expect(touchTargetSmSection).toContain('min-height: 44px');
  });

  /**
   * Test: Verify text truncation utilities are defined
   */
  it('text truncation utilities are defined', () => {
    expect(globalsContent).toContain('.truncate-1');
    expect(globalsContent).toContain('.truncate-2');
    expect(globalsContent).toContain('.truncate-3');
    expect(globalsContent).toContain('.break-word');
  });

  /**
   * Test: Verify mobile spacing utilities are defined
   */
  it('mobile spacing utilities are defined', () => {
    expect(globalsContent).toContain('.mobile-p-sm');
    expect(globalsContent).toContain('.mobile-px-sm');
    expect(globalsContent).toContain('.mobile-py-sm');
    expect(globalsContent).toContain('.mobile-gap-sm');
  });
});
