/**
 * Warranty API Configuration
 * Centralized configuration for warranty system integration
 */

export interface WarrantyConfig {
  apiBaseUrl: string;
  timeout: number;
  retryAttempts: number;
  debugMode: boolean;
  environment: 'development' | 'production' | 'test';
}

/**
 * Get warranty configuration based on environment
 */
export function getWarrantyConfig(): WarrantyConfig {
  const config: WarrantyConfig = {
    apiBaseUrl: process.env.NEXT_PUBLIC_WARRANTY_API_URL || 'https://vm6.eport.ws/register',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'),
    debugMode: process.env.NEXT_PUBLIC_DEBUG_API === 'true',
    environment: (process.env.NEXT_PUBLIC_APP_ENV as any) || 'production',
  };

  // Validate configuration
  if (!config.apiBaseUrl) {
    throw new Error('WARRANTY_API_URL is required');
  }

  if (config.timeout < 1000) {
    console.warn('API timeout is very low, setting minimum to 1000ms');
    config.timeout = 1000;
  }

  if (config.retryAttempts < 1) {
    console.warn('Retry attempts must be at least 1, setting to 1');
    config.retryAttempts = 1;
  }

  return config;
}

/**
 * Validate API endpoint connectivity
 */
export async function validateWarrantyApiEndpoint(): Promise<boolean> {
  try {
    const config = getWarrantyConfig();
    const response = await fetch(`${config.apiBaseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(config.timeout),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Warranty API endpoint validation failed:', error);
    return false;
  }
}

/**
 * Get environment-specific API configuration
 */
export function getApiEndpoints() {
  const config = getWarrantyConfig();
  const baseUrl = config.apiBaseUrl;
  
  return {
    register: `${baseUrl}/api/warranty/register`,
    check: (assetId: string) => `${baseUrl}/api/warranty/check/${assetId}`,
    registrations: `${baseUrl}/api/warranty/list`, // Updated endpoint name
    health: `${baseUrl}/health`,
  };
}