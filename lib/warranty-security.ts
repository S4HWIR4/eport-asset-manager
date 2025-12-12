/**
 * Warranty Security Module
 * Implements security best practices for warranty operations
 */

import { z } from 'zod';

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting configuration
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // Max requests per window
    MAX_REGISTRATION_ATTEMPTS: 5, // Max warranty registrations per window
    MAX_STATUS_CHECKS: 50, // Max status checks per window
  },
  
  // Token configuration
  TOKEN: {
    EXPIRY_HOURS: 8, // 8 hours
    REFRESH_THRESHOLD_MINUTES: 30, // Refresh if expires within 30 minutes
  },
  
  // Input validation limits
  INPUT_LIMITS: {
    MAX_ASSET_ID_LENGTH: 100,
    MAX_ASSET_NAME_LENGTH: 200,
    MAX_EMAIL_LENGTH: 255,
    MAX_NOTES_LENGTH: 1000,
    MIN_PASSWORD_LENGTH: 6,
    MAX_PASSWORD_LENGTH: 100,
  },
};

// Rate limiting store (in-memory for client-side)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class ClientRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  
  /**
   * Check if operation is allowed under rate limit
   */
  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }
    
    if (entry.count >= maxRequests) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, maxRequests: number): number {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - entry.count);
  }
  
  /**
   * Get reset time for a key
   */
  getResetTime(key: string): number | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return null;
    }
    return entry.resetTime;
  }
  
  /**
   * Clear expired entries (cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Global rate limiter instance
const rateLimiter = new ClientRateLimiter();

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
}

/**
 * Authentication token manager
 */
export class WarrantyTokenManager {
  private static readonly TOKEN_KEY = 'warranty_auth_token';
  private static readonly TOKEN_EXPIRY_KEY = 'warranty_token_expiry';
  
  /**
   * Store authentication token securely
   */
  static storeToken(token: string, expiryHours: number = SECURITY_CONFIG.TOKEN.EXPIRY_HOURS): void {
    if (typeof window === 'undefined') return;
    
    try {
      const expiryTime = Date.now() + (expiryHours * 60 * 60 * 1000);
      
      // Store in sessionStorage for better security (cleared on tab close)
      sessionStorage.setItem(this.TOKEN_KEY, token);
      sessionStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
      
      // Also store in localStorage as backup (with shorter expiry)
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
    } catch (error) {
      console.warn('Failed to store authentication token:', error);
    }
  }
  
  /**
   * Retrieve authentication token
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      // Try sessionStorage first, then localStorage
      let token = sessionStorage.getItem(this.TOKEN_KEY);
      let expiryStr = sessionStorage.getItem(this.TOKEN_EXPIRY_KEY);
      
      if (!token || !expiryStr) {
        token = localStorage.getItem(this.TOKEN_KEY);
        expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
      }
      
      if (!token || !expiryStr) {
        return null;
      }
      
      const expiry = parseInt(expiryStr);
      if (Date.now() > expiry) {
        // Token expired, clear it
        this.clearToken();
        return null;
      }
      
      return token;
    } catch (error) {
      console.warn('Failed to retrieve authentication token:', error);
      return null;
    }
  }
  
  /**
   * Check if token needs refresh
   */
  static needsRefresh(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const expiryStr = sessionStorage.getItem(this.TOKEN_EXPIRY_KEY) || 
                       localStorage.getItem(this.TOKEN_EXPIRY_KEY);
      
      if (!expiryStr) return false;
      
      const expiry = parseInt(expiryStr);
      const refreshThreshold = SECURITY_CONFIG.TOKEN.REFRESH_THRESHOLD_MINUTES * 60 * 1000;
      
      return (expiry - Date.now()) < refreshThreshold;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Clear authentication token
   */
  static clearToken(): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.TOKEN_EXPIRY_KEY);
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.warn('Failed to clear authentication token:', error);
    }
  }
  
  /**
   * Get token expiry time
   */
  static getTokenExpiry(): number | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const expiryStr = sessionStorage.getItem(this.TOKEN_EXPIRY_KEY) || 
                       localStorage.getItem(this.TOKEN_EXPIRY_KEY);
      
      return expiryStr ? parseInt(expiryStr) : null;
    } catch (error) {
      return null;
    }
  }
}

/**
 * Input sanitization and validation
 */
export class WarrantySecurity {
  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  }
  
  /**
   * Validate and sanitize asset ID
   */
  static validateAssetId(assetId: string): { valid: boolean; sanitized: string; error?: string } {
    if (!assetId || typeof assetId !== 'string') {
      return { valid: false, sanitized: '', error: 'Asset ID is required' };
    }
    
    const sanitized = assetId.trim().substring(0, SECURITY_CONFIG.INPUT_LIMITS.MAX_ASSET_ID_LENGTH);
    
    if (sanitized.length === 0) {
      return { valid: false, sanitized: '', error: 'Asset ID cannot be empty' };
    }
    
    // Check for valid characters (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9\-_]+$/.test(sanitized)) {
      return { valid: false, sanitized, error: 'Asset ID contains invalid characters' };
    }
    
    return { valid: true, sanitized };
  }
  
  /**
   * Validate email address
   */
  static validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
    if (!email || typeof email !== 'string') {
      return { valid: false, sanitized: '', error: 'Email is required' };
    }
    
    const sanitized = email.trim().toLowerCase().substring(0, SECURITY_CONFIG.INPUT_LIMITS.MAX_EMAIL_LENGTH);
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      return { valid: false, sanitized, error: 'Invalid email format' };
    }
    
    return { valid: true, sanitized };
  }
  
  /**
   * Check rate limit for warranty operations
   */
  static checkRateLimit(operation: 'registration' | 'status_check' | 'general', identifier?: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number | null;
    error?: string;
  } {
    const config = SECURITY_CONFIG.RATE_LIMIT;
    const key = identifier ? `${operation}_${identifier}` : operation;
    
    let maxRequests: number;
    switch (operation) {
      case 'registration':
        maxRequests = config.MAX_REGISTRATION_ATTEMPTS;
        break;
      case 'status_check':
        maxRequests = config.MAX_STATUS_CHECKS;
        break;
      default:
        maxRequests = config.MAX_REQUESTS;
    }
    
    const allowed = rateLimiter.isAllowed(key, maxRequests, config.WINDOW_MS);
    const remaining = rateLimiter.getRemaining(key, maxRequests);
    const resetTime = rateLimiter.getResetTime(key);
    
    if (!allowed) {
      const resetDate = resetTime ? new Date(resetTime).toLocaleTimeString() : 'unknown';
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        error: `Rate limit exceeded for ${operation}. Try again after ${resetDate}`,
      };
    }
    
    return { allowed: true, remaining, resetTime };
  }
  
  /**
   * Generate CSRF token (simple implementation)
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Validate request headers for security
   */
  static validateRequestHeaders(headers: Record<string, string>): { valid: boolean; error?: string } {
    // Check for required headers
    const contentType = headers['content-type'] || headers['Content-Type'];
    if (contentType && !contentType.includes('application/json')) {
      return { valid: false, error: 'Invalid content type' };
    }
    
    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
    for (const header of suspiciousHeaders) {
      if (headers[header]) {
        console.warn(`Suspicious header detected: ${header}`);
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Log security event
   */
  static logSecurityEvent(event: string, details: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };
    
    // In production, this should be sent to a security monitoring service
    console.warn('Security Event:', logEntry);
    
    // Store in localStorage for debugging (limit to last 100 events)
    if (typeof window !== 'undefined') {
      try {
        const key = 'warranty_security_events';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(logEntry);
        
        // Keep only last 100 events
        if (existing.length > 100) {
          existing.splice(0, existing.length - 100);
        }
        
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (error) {
        console.warn('Failed to store security event:', error);
      }
    }
  }
}

/**
 * Security middleware for warranty API calls
 */
export function withSecurity<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    requireAuth?: boolean;
    rateLimit?: 'registration' | 'status_check' | 'general';
    validateInput?: boolean;
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      // Check authentication if required
      if (options.requireAuth) {
        const token = WarrantyTokenManager.getToken();
        if (!token) {
          WarrantySecurity.logSecurityEvent('unauthorized_access', {
            function: fn.name,
            args: args.map(arg => typeof arg),
          });
          throw new Error('Authentication required');
        }
        
        // Check if token needs refresh
        if (WarrantyTokenManager.needsRefresh()) {
          WarrantySecurity.logSecurityEvent('token_refresh_needed', {
            function: fn.name,
          });
        }
      }
      
      // Check rate limit
      if (options.rateLimit) {
        const rateLimitResult = WarrantySecurity.checkRateLimit(options.rateLimit);
        if (!rateLimitResult.allowed) {
          WarrantySecurity.logSecurityEvent('rate_limit_exceeded', {
            function: fn.name,
            operation: options.rateLimit,
            remaining: rateLimitResult.remaining,
          });
          throw new Error(rateLimitResult.error);
        }
      }
      
      // Validate input if required
      if (options.validateInput && args.length > 0) {
        for (const arg of args) {
          if (typeof arg === 'string' && arg.length > 10000) {
            WarrantySecurity.logSecurityEvent('suspicious_input_size', {
              function: fn.name,
              inputSize: arg.length,
            });
            throw new Error('Input size exceeds security limits');
          }
        }
      }
      
      // Execute the function
      return await fn(...args);
    } catch (error) {
      // Log security-related errors
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || 
            error.message.includes('authentication') ||
            error.message.includes('security')) {
          WarrantySecurity.logSecurityEvent('security_error', {
            function: fn.name,
            error: error.message,
          });
        }
      }
      throw error;
    }
  }) as T;
}

export { SECURITY_CONFIG };