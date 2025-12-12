/**
 * Warranty API Client Tests
 * Comprehensive tests for the centralized API client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WarrantyApiClient, WarrantyApiError, getWarrantyApiClient, resetWarrantyApiClient } from '../warranty-api-client';

// Mock the warranty config
vi.mock('../warranty-config', () => ({
  getWarrantyConfig: () => ({
    apiBaseUrl: 'https://test-api.example.com',
    timeout: 5000,
    retryAttempts: 2,
    debugMode: false,
    environment: 'test',
  }),
  getApiEndpoints: () => ({
    register: 'https://test-api.example.com/api/warranty/register',
    check: (assetId: string) => `https://test-api.example.com/api/warranty/check/${assetId}`,
    list: 'https://test-api.example.com/api/warranty/list',
    login: 'https://test-api.example.com/api/auth/login',
    health: 'https://test-api.example.com/health',
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WarrantyApiClient', () => {
  let client: WarrantyApiClient;

  beforeEach(() => {
    client = new WarrantyApiClient();
    mockFetch.mockClear();
  });

  afterEach(() => {
    resetWarrantyApiClient();
  });

  describe('Authentication Token Management', () => {
    it('should set and get auth token', () => {
      const token = 'test-token-123';
      client.setAuthToken(token);
      expect(client.getAuthToken()).toBe(token);
    });

    it('should clear auth token', () => {
      client.setAuthToken('test-token');
      client.setAuthToken(null);
      expect(client.getAuthToken()).toBeNull();
    });

    it('should include auth token in request headers', async () => {
      const token = 'test-auth-token';
      client.setAuthToken(token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await client.testConnection();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const testClient = new WarrantyApiClient();
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(testClient.testConnectionStrict()).rejects.toThrow(WarrantyApiError);
      await expect(testClient.testConnectionStrict()).rejects.toThrow('Failed to connect after 2 attempts');
    });

    it('should handle API errors', async () => {
      const testClient = new WarrantyApiClient();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Bad request' }),
      });

      await expect(testClient.testConnectionStrict()).rejects.toThrow(WarrantyApiError);
      await expect(testClient.testConnectionStrict()).rejects.toThrow('Bad request');
    });

    it('should handle JSON parse errors', async () => {
      const testClient = new WarrantyApiClient();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); },
      });

      await expect(testClient.testConnectionStrict()).rejects.toThrow(WarrantyApiError);
      await expect(testClient.testConnectionStrict()).rejects.toThrow('Failed to parse server response');
    });

    it('should handle application-level errors', async () => {
      const testClient = new WarrantyApiClient();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, message: 'Application error' }),
      });

      await expect(testClient.testConnectionStrict()).rejects.toThrow(WarrantyApiError);
      await expect(testClient.testConnectionStrict()).rejects.toThrow('Application error');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on server errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });

      const result = await client.testConnection();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client errors', async () => {
      const testClient = new WarrantyApiClient();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Bad request' }),
      });

      await expect(testClient.testConnectionStrict()).rejects.toThrow(WarrantyApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('API Methods', () => {
    describe('registerWarranty', () => {
      it('should register warranty successfully', async () => {
        const mockResponse = {
          warranty_id: 123,
          registration_date: '2023-12-11T10:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const data = {
          asset_id: 'asset-123',
          asset_name: 'Test Asset',
          user_email: 'test@example.com',
        };

        const result = await client.registerWarranty(data);
        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-api.example.com/api/warranty/register',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(data),
          })
        );
      });
    });

    describe('checkWarrantyStatus', () => {
      it('should check warranty status successfully', async () => {
        const mockResponse = {
          registered: true,
          warranty_id: 123,
          status: 'active',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await client.checkWarrantyStatus('asset-123');
        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://test-api.example.com/api/warranty/check/asset-123',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    describe('getWarrantyRegistrations', () => {
      it('should get warranty registrations successfully', async () => {
        const mockResponse = [
          {
            id: 1,
            asset_id: 'asset-1',
            asset_name: 'Asset 1',
            user_email: 'user1@example.com',
            registration_date: '2023-12-11T10:00:00Z',
            status: 'active',
            warranty_period_months: 12,
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await client.getWarrantyRegistrations();
        expect(result).toEqual(mockResponse);
      });
    });

    describe('testConnection', () => {
      it('should test connection successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'healthy' }),
        });

        const result = await client.testConnection();
        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/health'),
          expect.any(Object)
        );
      });

      it('should handle connection test failure', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

        const result = await client.testConnection();
        expect(result).toBe(false);
      });
    });

    describe('testConnectionStrict', () => {
      it('should test connection strictly and throw on failure', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

        await expect(client.testConnectionStrict()).rejects.toThrow();
      });
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const client1 = getWarrantyApiClient();
      const client2 = getWarrantyApiClient();
      expect(client1).toBe(client2);
    });

    it('should reset instance', () => {
      const client1 = getWarrantyApiClient();
      resetWarrantyApiClient();
      const client2 = getWarrantyApiClient();
      expect(client1).not.toBe(client2);
    });
  });
});