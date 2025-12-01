import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { formatCurrency, formatDate, toISODate, dateToISOString } from '@/lib/utils';

describe('Formatting Utilities Properties', () => {
  /**
   * Feature: ui-ux-bug-fixes, Property 1: Currency formatting correctness
   * For any numeric value, formatting it as currency should produce a string with a dollar sign,
   * comma separators for thousands, and exactly two decimal places
   * Validates: Requirements 2.1, 2.5
   */
  it('Property 1: currency formatting correctness', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000000000, max: 1000000000, noNaN: true, noDefaultInfinity: true }),
        (amount) => {
          const formatted = formatCurrency(amount);

          // Should start with dollar sign
          expect(formatted).toMatch(/^\$/);

          // Should have exactly two decimal places
          expect(formatted).toMatch(/\.\d{2}$/);

          // Extract the numeric part (remove $ and commas)
          const numericPart = formatted.substring(1).replace(/,/g, '');
          const parsedValue = parseFloat(numericPart);

          // The parsed value should be close to the original (within floating point precision)
          expect(Math.abs(parsedValue - amount)).toBeLessThan(0.01);

          // For values >= 1000 or <= -1000, should have comma separators
          if (Math.abs(amount) >= 1000) {
            expect(formatted).toMatch(/,/);
          }

          // Should have exactly 2 decimal places
          const decimalPart = formatted.split('.')[1];
          expect(decimalPart).toHaveLength(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test edge cases for currency formatting
   */
  it('currency formatting handles edge cases', () => {
    // Null should return $0.00
    expect(formatCurrency(null)).toBe('$0.00');

    // Undefined should return $0.00
    expect(formatCurrency(undefined)).toBe('$0.00');

    // NaN should return $0.00
    expect(formatCurrency(NaN)).toBe('$0.00');

    // Infinity should return $0.00
    expect(formatCurrency(Infinity)).toBe('$0.00');
    expect(formatCurrency(-Infinity)).toBe('$0.00');

    // Zero should format correctly
    expect(formatCurrency(0)).toBe('$0.00');

    // Small positive value
    expect(formatCurrency(0.01)).toBe('$0.01');

    // Small negative value
    expect(formatCurrency(-0.01)).toBe('$-0.01');

    // Large value with commas
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');

    // Negative large value
    expect(formatCurrency(-1234567.89)).toBe('$-1,234,567.89');
  });

  /**
   * Feature: ui-ux-bug-fixes, Property 2: Date round-trip preservation
   * For any date value entered in a date input, storing it to the database and retrieving it
   * should return the same date without timezone shifts
   * Validates: Requirements 3.1
   */
  it('Property 2: date round-trip preservation', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1900-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          // Skip invalid dates
          if (isNaN(date.getTime())) {
            return true;
          }
          
          // Convert date to ISO date string (YYYY-MM-DD) - simulating form input
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const isoDateString = `${year}-${month}-${day}`;

          // Store it (toISODate simulates storage preparation)
          const stored = toISODate(isoDateString);

          // Retrieve and format it (formatDate simulates display)
          const formatted = formatDate(stored);

          // Parse the formatted date back
          const expectedDate = new Date(isoDateString + 'T00:00:00');
          const expectedFormatted = expectedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          // The formatted output should match the expected format
          expect(formatted).toBe(expectedFormatted);

          // The stored value should be the same as input
          expect(stored).toBe(isoDateString);

          // Verify no timezone shift occurred
          const retrievedDate = new Date(stored + 'T00:00:00');
          expect(retrievedDate.getFullYear()).toBe(year);
          expect(retrievedDate.getMonth() + 1).toBe(parseInt(month));
          expect(retrievedDate.getDate()).toBe(parseInt(day));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test edge cases for date formatting
   */
  it('date formatting handles edge cases', () => {
    // Null should return N/A
    expect(formatDate(null)).toBe('N/A');

    // Undefined should return N/A
    expect(formatDate(undefined)).toBe('N/A');

    // Invalid date string should return Invalid Date
    expect(formatDate('not-a-date')).toBe('Invalid Date');

    // Empty string should return N/A
    expect(formatDate('')).toBe('N/A');

    // Valid date should format correctly
    expect(formatDate('2024-01-15')).toMatch(/Jan 15, 2024/);

    // Edge date: leap year
    expect(formatDate('2024-02-29')).toMatch(/Feb 29, 2024/);
  });

  /**
   * Test edge cases for toISODate
   */
  it('toISODate handles edge cases', () => {
    // Null should return empty string
    expect(toISODate(null)).toBe('');

    // Undefined should return empty string
    expect(toISODate(undefined)).toBe('');

    // Invalid date should return empty string
    expect(toISODate('not-a-date')).toBe('');

    // Empty string should return empty string
    expect(toISODate('')).toBe('');

    // Valid date should return as-is
    expect(toISODate('2024-01-15')).toBe('2024-01-15');

    // Leap year date
    expect(toISODate('2024-02-29')).toBe('2024-02-29');
  });
});

  /**
   * Test dateToISOString for converting Date objects without timezone shifts
   */
  it('dateToISOString preserves local date without timezone shifts', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1900-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          // Skip invalid dates
          if (isNaN(date.getTime())) {
            return true;
          }
          
          // Get expected values from the Date object
          const expectedYear = date.getFullYear();
          const expectedMonth = String(date.getMonth() + 1).padStart(2, '0');
          const expectedDay = String(date.getDate()).padStart(2, '0');
          const expectedISO = `${expectedYear}-${expectedMonth}-${expectedDay}`;

          // Convert using dateToISOString
          const result = dateToISOString(date);

          // Should match expected format
          expect(result).toBe(expectedISO);

          // Should be valid ISO date format
          expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

          // Verify no timezone shift by parsing back
          const parsed = new Date(result + 'T00:00:00');
          expect(parsed.getFullYear()).toBe(expectedYear);
          expect(parsed.getMonth() + 1).toBe(parseInt(expectedMonth));
          expect(parsed.getDate()).toBe(parseInt(expectedDay));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test edge cases for dateToISOString
   */
  it('dateToISOString handles edge cases', () => {
    // Null should return empty string
    expect(dateToISOString(null)).toBe('');

    // Undefined should return empty string
    expect(dateToISOString(undefined)).toBe('');

    // Invalid date should return empty string
    expect(dateToISOString(new Date('invalid'))).toBe('');

    // Valid date should format correctly
    const testDate = new Date('2024-01-15T00:00:00');
    expect(dateToISOString(testDate)).toBe('2024-01-15');

    // Leap year date
    const leapDate = new Date('2024-02-29T00:00:00');
    expect(dateToISOString(leapDate)).toBe('2024-02-29');

    // Edge case: single digit month and day should be padded
    const edgeDate = new Date('2024-01-05T00:00:00');
    expect(dateToISOString(edgeDate)).toBe('2024-01-05');
  });
