import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with thousand separators and two decimal places
 * @param amount - The numeric amount to format
 * @param currency - Currency symbol (default: '$')
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number | null | undefined, currency: string = '$'): string {
  // Handle null, undefined, NaN, and Infinity
  if (amount == null || !isFinite(amount)) {
    return `${currency}0.00`;
  }

  return `${currency}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a date string for display without timezone shifts
 * @param dateString - ISO date string from database (YYYY-MM-DD or full timestamp)
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(dateString: string | null | undefined): string {
  // Handle null or undefined
  if (!dateString) {
    return 'N/A';
  }

  try {
    // Check if it's a date-only string (YYYY-MM-DD) or a full timestamp
    let date: Date;
    if (dateString.includes('T') || dateString.includes(' ')) {
      // It's a timestamp, parse directly
      date = new Date(dateString);
    } else {
      // It's a date-only string, append T00:00:00 to force local timezone interpretation
      date = new Date(dateString + 'T00:00:00');
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Convert a date input value to ISO date string for storage
 * @param dateInput - Date input value from form (YYYY-MM-DD)
 * @returns ISO date string (YYYY-MM-DD)
 */
export function toISODate(dateInput: string | null | undefined): string {
  // Handle null or undefined
  if (!dateInput) {
    return '';
  }

  // Date input already provides YYYY-MM-DD format
  // Just validate it's a proper date
  try {
    const date = new Date(dateInput + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return '';
    }
    return dateInput;
  } catch (error) {
    return '';
  }
}

/**
 * Convert a Date object to ISO date string without timezone shifts
 * @param date - Date object from DatePicker
 * @returns ISO date string (YYYY-MM-DD) in local timezone
 */
export function dateToISOString(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  // Get local date components to avoid timezone shifts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
