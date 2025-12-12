/**
 * Warranty Monitoring and Error Logging System
 * Comprehensive error logging, performance monitoring, and reporting
 */

import { performance } from 'perf_hooks';

// Monitoring configuration
const MONITORING_CONFIG = {
  // Error logging
  ERROR_LOG: {
    MAX_ENTRIES: 1000,
    STORAGE_KEY: 'warranty_error_log',
    BATCH_SIZE: 10,
    FLUSH_INTERVAL_MS: 30000, // 30 seconds
  },
  
  // Performance monitoring
  PERFORMANCE: {
    SLOW_OPERATION_THRESHOLD_MS: 2000,
    STORAGE_KEY: 'warranty_performance_log',
    MAX_ENTRIES: 500,
  },
  
  // User feedback
  FEEDBACK: {
    STORAGE_KEY: 'warranty_user_feedback',
    MAX_ENTRIES: 100,
  },
};

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Error categories
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  API = 'api',
  UI = 'ui',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UNKNOWN = 'unknown',
}

// Error log entry interface
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    operation: string;
    component?: string;
    userId?: string;
    assetId?: string;
    url: string;
    userAgent: string;
  };
  metadata?: Record<string, any>;
}

// Performance log entry interface
export interface PerformanceLogEntry {
  id: string;
  timestamp: string;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

// User feedback entry interface
export interface UserFeedbackEntry {
  id: string;
  timestamp: string;
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  operation: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}

/**
 * Error Logger - Centralized error logging system
 */
export class WarrantyErrorLogger {
  private static errorQueue: ErrorLogEntry[] = [];
  private static flushTimer: NodeJS.Timeout | null = null;
  
  /**
   * Log an error with context
   */
  static logError(
    error: Error | string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    operation: string,
    context: Partial<ErrorLogEntry['context']> = {},
    metadata?: Record<string, any>
  ): void {
    const errorEntry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      severity,
      category,
      message: typeof error === 'string' ? error : error.message,
      error: typeof error === 'object' ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      context: {
        operation,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        ...context,
      },
      metadata,
    };
    
    // Add to queue
    this.errorQueue.push(errorEntry);
    
    // Console logging based on severity
    this.consoleLog(errorEntry);
    
    // Store immediately for critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      this.flushErrors();
    } else {
      // Schedule batch flush
      this.scheduleBatchFlush();
    }
  }
  
  /**
   * Log network errors
   */
  static logNetworkError(
    error: Error | string,
    operation: string,
    url?: string,
    statusCode?: number,
    metadata?: Record<string, any>
  ): void {
    this.logError(
      error,
      ErrorSeverity.HIGH,
      ErrorCategory.NETWORK,
      operation,
      { url },
      { statusCode, ...metadata }
    );
  }
  
  /**
   * Log validation errors
   */
  static logValidationError(
    error: Error | string,
    operation: string,
    fieldName?: string,
    value?: any,
    metadata?: Record<string, any>
  ): void {
    this.logError(
      error,
      ErrorSeverity.MEDIUM,
      ErrorCategory.VALIDATION,
      operation,
      {},
      { fieldName, value, ...metadata }
    );
  }
  
  /**
   * Log authentication errors
   */
  static logAuthError(
    error: Error | string,
    operation: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.logError(
      error,
      ErrorSeverity.HIGH,
      ErrorCategory.AUTHENTICATION,
      operation,
      { userId },
      metadata
    );
  }
  
  /**
   * Log API errors
   */
  static logApiError(
    error: Error | string,
    operation: string,
    endpoint?: string,
    statusCode?: number,
    metadata?: Record<string, any>
  ): void {
    const severity = statusCode && statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
    this.logError(
      error,
      severity,
      ErrorCategory.API,
      operation,
      {},
      { endpoint, statusCode, ...metadata }
    );
  }
  
  /**
   * Console logging based on severity
   */
  private static consoleLog(entry: ErrorLogEntry): void {
    const logMessage = `[${entry.severity.toUpperCase()}] ${entry.category}: ${entry.message}`;
    
    switch (entry.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨', logMessage, entry);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌', logMessage, entry);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️', logMessage, entry);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️', logMessage, entry);
        break;
    }
  }
  
  /**
   * Schedule batch flush of errors
   */
  private static scheduleBatchFlush(): void {
    if (this.flushTimer) return;
    
    this.flushTimer = setTimeout(() => {
      this.flushErrors();
      this.flushTimer = null;
    }, MONITORING_CONFIG.ERROR_LOG.FLUSH_INTERVAL_MS);
  }
  
  /**
   * Flush errors to storage
   */
  private static flushErrors(): void {
    if (typeof window === 'undefined' || this.errorQueue.length === 0) return;
    
    try {
      const existing = this.getStoredErrors();
      const combined = [...existing, ...this.errorQueue];
      
      // Keep only the most recent entries
      const trimmed = combined.slice(-MONITORING_CONFIG.ERROR_LOG.MAX_ENTRIES);
      
      localStorage.setItem(
        MONITORING_CONFIG.ERROR_LOG.STORAGE_KEY,
        JSON.stringify(trimmed)
      );
      
      // Clear the queue
      this.errorQueue = [];
    } catch (error) {
      console.error('Failed to flush error log:', error);
    }
  }
  
  /**
   * Get stored errors
   */
  static getStoredErrors(): ErrorLogEntry[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(MONITORING_CONFIG.ERROR_LOG.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve error log:', error);
      return [];
    }
  }
  
  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(MONITORING_CONFIG.ERROR_LOG.STORAGE_KEY);
      this.errorQueue = [];
    } catch (error) {
      console.error('Failed to clear error log:', error);
    }
  }
  
  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get error statistics
   */
  static getErrorStatistics(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    recent: ErrorLogEntry[];
  } {
    const errors = this.getStoredErrors();
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const bySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = 0;
      return acc;
    }, {} as Record<ErrorSeverity, number>);
    
    const byCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = 0;
      return acc;
    }, {} as Record<ErrorCategory, number>);
    
    const recent: ErrorLogEntry[] = [];
    
    errors.forEach(error => {
      bySeverity[error.severity]++;
      byCategory[error.category]++;
      
      if (new Date(error.timestamp).getTime() > oneHourAgo) {
        recent.push(error);
      }
    });
    
    return {
      total: errors.length,
      bySeverity,
      byCategory,
      recent,
    };
  }
}

/**
 * Performance Monitor - Track operation performance
 */
export class WarrantyPerformanceMonitor {
  private static performanceLog: PerformanceLogEntry[] = [];
  
  /**
   * Start performance tracking for an operation
   */
  static startOperation(operation: string): () => void {
    const startTime = performance.now();
    
    return (success: boolean = true, metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      this.logPerformance(operation, duration, success, metadata);
    };
  }
  
  /**
   * Log performance data
   */
  static logPerformance(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const entry: PerformanceLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      operation,
      duration,
      success,
      metadata,
    };
    
    this.performanceLog.push(entry);
    
    // Log slow operations
    if (duration > MONITORING_CONFIG.PERFORMANCE.SLOW_OPERATION_THRESHOLD_MS) {
      WarrantyErrorLogger.logError(
        `Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`,
        ErrorSeverity.MEDIUM,
        ErrorCategory.PERFORMANCE,
        operation,
        {},
        { duration, ...metadata }
      );
    }
    
    // Store performance data
    this.storePerformanceData();
  }
  
  /**
   * Store performance data
   */
  private static storePerformanceData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Keep only recent entries
      const trimmed = this.performanceLog.slice(-MONITORING_CONFIG.PERFORMANCE.MAX_ENTRIES);
      
      localStorage.setItem(
        MONITORING_CONFIG.PERFORMANCE.STORAGE_KEY,
        JSON.stringify(trimmed)
      );
    } catch (error) {
      console.error('Failed to store performance data:', error);
    }
  }
  
  /**
   * Get performance statistics
   */
  static getPerformanceStatistics(): {
    averageDuration: number;
    slowOperations: PerformanceLogEntry[];
    successRate: number;
    operationStats: Record<string, { count: number; avgDuration: number; successRate: number }>;
  } {
    const totalDuration = this.performanceLog.reduce((sum, entry) => sum + entry.duration, 0);
    const averageDuration = this.performanceLog.length > 0 ? totalDuration / this.performanceLog.length : 0;
    
    const slowOperations = this.performanceLog.filter(
      entry => entry.duration > MONITORING_CONFIG.PERFORMANCE.SLOW_OPERATION_THRESHOLD_MS
    );
    
    const successfulOperations = this.performanceLog.filter(entry => entry.success).length;
    const successRate = this.performanceLog.length > 0 ? successfulOperations / this.performanceLog.length : 0;
    
    // Group by operation
    const operationStats: Record<string, { count: number; avgDuration: number; successRate: number }> = {};
    
    this.performanceLog.forEach(entry => {
      if (!operationStats[entry.operation]) {
        operationStats[entry.operation] = { count: 0, avgDuration: 0, successRate: 0 };
      }
      operationStats[entry.operation].count++;
    });
    
    Object.keys(operationStats).forEach(operation => {
      const entries = this.performanceLog.filter(entry => entry.operation === operation);
      const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
      const successfulEntries = entries.filter(entry => entry.success).length;
      
      operationStats[operation].avgDuration = totalDuration / entries.length;
      operationStats[operation].successRate = successfulEntries / entries.length;
    });
    
    return {
      averageDuration,
      slowOperations,
      successRate,
      operationStats,
    };
  }
  
  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * User Feedback Manager - Track user-facing messages and issues
 */
export class WarrantyUserFeedback {
  /**
   * Log user feedback (success, error, warning messages shown to user)
   */
  static logFeedback(
    type: 'error' | 'success' | 'warning' | 'info',
    message: string,
    operation: string,
    metadata?: Record<string, any>
  ): void {
    if (typeof window === 'undefined') return;
    
    const entry: UserFeedbackEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type,
      message,
      operation,
      resolved: false,
      metadata,
    };
    
    try {
      const existing = this.getStoredFeedback();
      const updated = [...existing, entry].slice(-MONITORING_CONFIG.FEEDBACK.MAX_ENTRIES);
      
      localStorage.setItem(
        MONITORING_CONFIG.FEEDBACK.STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error('Failed to store user feedback:', error);
    }
  }
  
  /**
   * Get stored feedback
   */
  static getStoredFeedback(): UserFeedbackEntry[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(MONITORING_CONFIG.FEEDBACK.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve user feedback:', error);
      return [];
    }
  }
  
  /**
   * Mark feedback as resolved
   */
  static resolveFeedback(id: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const feedback = this.getStoredFeedback();
      const updated = feedback.map(entry => 
        entry.id === id ? { ...entry, resolved: true } : entry
      );
      
      localStorage.setItem(
        MONITORING_CONFIG.FEEDBACK.STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error('Failed to resolve feedback:', error);
    }
  }
  
  /**
   * Generate unique ID
   */
  private static generateId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Monitoring Dashboard - Get comprehensive monitoring data
 */
export class WarrantyMonitoringDashboard {
  /**
   * Get comprehensive monitoring report
   */
  static getMonitoringReport(): {
    errors: ReturnType<typeof WarrantyErrorLogger.getErrorStatistics>;
    performance: ReturnType<typeof WarrantyPerformanceMonitor.getPerformanceStatistics>;
    feedback: UserFeedbackEntry[];
    systemHealth: {
      status: 'healthy' | 'warning' | 'critical';
      issues: string[];
      recommendations: string[];
    };
  } {
    const errors = WarrantyErrorLogger.getErrorStatistics();
    const performance = WarrantyPerformanceMonitor.getPerformanceStatistics();
    const feedback = WarrantyUserFeedback.getStoredFeedback();
    
    // Determine system health
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Check error rates
    if (errors.bySeverity[ErrorSeverity.CRITICAL] > 0) {
      status = 'critical';
      issues.push(`${errors.bySeverity[ErrorSeverity.CRITICAL]} critical errors detected`);
      recommendations.push('Investigate critical errors immediately');
    }
    
    if (errors.bySeverity[ErrorSeverity.HIGH] > 5) {
      if (status !== 'critical') status = 'warning';
      issues.push(`High number of high-severity errors: ${errors.bySeverity[ErrorSeverity.HIGH]}`);
      recommendations.push('Review and address high-severity errors');
    }
    
    // Check performance
    if (performance.averageDuration > MONITORING_CONFIG.PERFORMANCE.SLOW_OPERATION_THRESHOLD_MS) {
      if (status !== 'critical') status = 'warning';
      issues.push(`Average operation duration is slow: ${performance.averageDuration.toFixed(2)}ms`);
      recommendations.push('Optimize slow operations');
    }
    
    if (performance.successRate < 0.95) {
      if (status !== 'critical') status = 'warning';
      issues.push(`Low success rate: ${(performance.successRate * 100).toFixed(1)}%`);
      recommendations.push('Investigate operation failures');
    }
    
    // Check user feedback
    const recentErrors = feedback.filter(f => 
      f.type === 'error' && 
      !f.resolved && 
      new Date(f.timestamp).getTime() > Date.now() - (60 * 60 * 1000)
    );
    
    if (recentErrors.length > 10) {
      if (status !== 'critical') status = 'warning';
      issues.push(`High number of recent user errors: ${recentErrors.length}`);
      recommendations.push('Review user-facing error messages');
    }
    
    return {
      errors,
      performance,
      feedback,
      systemHealth: {
        status,
        issues,
        recommendations,
      },
    };
  }
  
  /**
   * Export monitoring data for external analysis
   */
  static exportMonitoringData(): string {
    const report = this.getMonitoringReport();
    return JSON.stringify(report, null, 2);
  }
}

// Initialize performance monitoring cleanup
if (typeof window !== 'undefined') {
  // Clean up old performance data every hour
  setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    WarrantyPerformanceMonitor['performanceLog'] = WarrantyPerformanceMonitor['performanceLog'].filter(
      entry => new Date(entry.timestamp).getTime() > oneHourAgo
    );
  }, 60 * 60 * 1000);
}

export {
  MONITORING_CONFIG,
};