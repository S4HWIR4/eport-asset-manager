/**
 * Warranty API Client
 * Centralized HTTP client for warranty system integration
 */

import { getWarrantyConfig, getApiEndpoints } from './warranty-config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  detail?: string;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: any;
}

export class WarrantyApiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: any;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'WarrantyApiError';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

/**
 * Centralized API client for warranty operations
 */
export class WarrantyApiClient {
  private config = getWarrantyConfig();
  private endpoints = getApiEndpoints();
  private authToken: string | null = null;

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Create fetch configuration with common headers and options
   */
  private createFetchConfig(options: RequestInit = {}): RequestInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Add authentication header if token is available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    };
  }

  /**
   * Debug logging helper
   */
  private debugLog(message: string, data?: any): void {
    if (this.config.debugMode) {
      console.log(`[Warranty API Client] ${message}`, data);
    }
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null;
    let response: Response | null = null;

    this.debugLog(`Making request to ${url}`, { method: options.method || 'GET' });

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        response = await fetch(url, this.createFetchConfig(options));

        if (response.ok) {
          this.debugLog(`Request successful`, { url, attempt, status: response.status });
          break;
        } else if (response.status >= 400 && response.status < 500) {
          // Client errors shouldn't be retried
          this.debugLog(`Client error, not retrying`, { url, status: response.status, attempt });
          break;
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        lastError = error as Error;
        this.debugLog(`Request attempt failed`, { url, attempt, error: lastError.message });

        if (attempt === this.config.retryAttempts) {
          throw new WarrantyApiError({
            code: 'NETWORK_ERROR',
            message: `Failed to connect after ${this.config.retryAttempts} attempts: ${lastError.message}`,
            details: { url, attempts: attempt },
          });
        }

        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000;
        this.debugLog(`Retrying in ${delay}ms`, { attempt, url });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!response) {
      throw new WarrantyApiError({
        code: 'NETWORK_ERROR',
        message: 'Failed to get response from server',
        details: { url },
      });
    }

    // Parse response
    let result: ApiResponse<T>;
    try {
      result = await response.json();
    } catch (error) {
      throw new WarrantyApiError({
        code: 'PARSE_ERROR',
        message: 'Failed to parse server response',
        status: response.status,
        details: { url, error: (error as Error).message },
      });
    }

    // Handle API errors
    if (!response.ok) {
      throw new WarrantyApiError({
        code: 'API_ERROR',
        message: result.detail || result.error || result.message || 'API request failed',
        status: response.status,
        details: { url, response: result },
      });
    }

    // Handle application-level errors
    if (result.success === false) {
      throw new WarrantyApiError({
        code: 'APPLICATION_ERROR',
        message: result.message || result.error || 'Application error occurred',
        status: response.status,
        details: { url, response: result },
      });
    }

    return (result.data || result) as T;
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest(this.endpoints.health);
      return true;
    } catch (error) {
      this.debugLog('Connection test failed', error);
      return false;
    }
  }

  /**
   * Test API connectivity (throws on error for testing)
   */
  async testConnectionStrict(): Promise<void> {
    await this.makeRequest(this.endpoints.health);
  }

  /**
   * Register warranty for an asset
   */
  async registerWarranty(data: {
    asset_id: string;
    asset_name: string;
    user_email: string;
    user_name?: string;
    warranty_period_months?: number;
    notes?: string;
  }): Promise<{ warranty_id: number; registration_date: string }> {
    return this.makeRequest(this.endpoints.register, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Check warranty status for an asset
   */
  async checkWarrantyStatus(assetId: string): Promise<{
    registered: boolean;
    warranty_id?: number;
    registration_date?: string;
    status?: string;
  }> {
    return this.makeRequest(this.endpoints.check(assetId));
  }


}

// Singleton instance
let apiClientInstance: WarrantyApiClient | null = null;

/**
 * Get singleton warranty API client instance
 */
export function getWarrantyApiClient(): WarrantyApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new WarrantyApiClient();
  }
  return apiClientInstance;
}

/**
 * Reset API client instance (useful for testing)
 */
export function resetWarrantyApiClient(): void {
  apiClientInstance = null;
}