#!/usr/bin/env tsx

/**
 * Backend Connectivity and CORS Test
 * Tests Task 1.4: Test backend connectivity and CORS configuration
 * Validates: Requirements 5.1, 5.2
 */

import { getWarrantyConfig, getApiEndpoints, validateWarrantyApiEndpoint } from '../lib/warranty-config';
import { getWarrantyApiClient } from '../lib/warranty-api-client';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
}

async function testHealthEndpoint(): Promise<TestResult> {
  try {
    const config = getWarrantyConfig();
    const response = await fetch(`${config.apiBaseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(config.timeout),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        name: 'Health Endpoint',
        success: true,
        message: 'Health endpoint accessible',
        details: { status: response.status, data },
      };
    } else {
      return {
        name: 'Health Endpoint',
        success: false,
        message: `Health endpoint returned ${response.status}`,
        details: { status: response.status },
      };
    }
  } catch (error) {
    return {
      name: 'Health Endpoint',
      success: false,
      message: `Health endpoint failed: ${(error as Error).message}`,
    };
  }
}

async function testCorsHeaders(): Promise<TestResult> {
  try {
    const config = getWarrantyConfig();
    const response = await fetch(`${config.apiBaseUrl}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
      signal: AbortSignal.timeout(config.timeout),
    });

    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
    };

    const hasCorsSupport = corsHeaders['access-control-allow-origin'] !== null;

    return {
      name: 'CORS Configuration',
      success: hasCorsSupport,
      message: hasCorsSupport ? 'CORS headers present' : 'CORS headers missing',
      details: { status: response.status, corsHeaders },
    };
  } catch (error) {
    return {
      name: 'CORS Configuration',
      success: false,
      message: `CORS test failed: ${(error as Error).message}`,
    };
  }
}

async function testHttpsConnection(): Promise<TestResult> {
  try {
    const config = getWarrantyConfig();
    
    if (!config.apiBaseUrl.startsWith('https://')) {
      return {
        name: 'HTTPS Connection',
        success: false,
        message: 'API URL does not use HTTPS',
        details: { url: config.apiBaseUrl },
      };
    }

    const response = await fetch(`${config.apiBaseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(config.timeout),
    });

    return {
      name: 'HTTPS Connection',
      success: response.ok,
      message: response.ok ? 'HTTPS connection successful' : 'HTTPS connection failed',
      details: { 
        status: response.status,
        url: config.apiBaseUrl,
        protocol: new URL(config.apiBaseUrl).protocol,
      },
    };
  } catch (error) {
    return {
      name: 'HTTPS Connection',
      success: false,
      message: `HTTPS test failed: ${(error as Error).message}`,
    };
  }
}

async function testApiEndpoints(): Promise<TestResult[]> {
  const endpoints = getApiEndpoints();
  const client = getWarrantyApiClient();
  const results: TestResult[] = [];

  // Test warranty check endpoint (should work without auth)
  try {
    await client.checkWarrantyStatus('test-asset-connectivity-check');
    results.push({
      name: 'Warranty Check Endpoint',
      success: true,
      message: 'Warranty check endpoint accessible',
    });
  } catch (error) {
    results.push({
      name: 'Warranty Check Endpoint',
      success: false,
      message: `Warranty check failed: ${(error as Error).message}`,
    });
  }

  // Test warranty list endpoint (may require auth, expect 401/403)
  try {
    const response = await fetch(endpoints.registrations, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
    });

    const isExpectedResponse = response.status === 200 || response.status === 401 || response.status === 403;
    results.push({
      name: 'Warranty List Endpoint',
      success: isExpectedResponse,
      message: isExpectedResponse 
        ? `Warranty list endpoint responding (${response.status})`
        : `Unexpected response: ${response.status}`,
      details: { status: response.status },
    });
  } catch (error) {
    results.push({
      name: 'Warranty List Endpoint',
      success: false,
      message: `Warranty list test failed: ${(error as Error).message}`,
    });
  }

  return results;
}

async function testNetworkLatency(): Promise<TestResult> {
  try {
    const config = getWarrantyConfig();
    const startTime = Date.now();
    
    const response = await fetch(`${config.apiBaseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(config.timeout),
    });
    
    const endTime = Date.now();
    const latency = endTime - startTime;

    const isAcceptable = latency < 5000; // 5 seconds threshold

    return {
      name: 'Network Latency',
      success: isAcceptable,
      message: `Network latency: ${latency}ms ${isAcceptable ? '(acceptable)' : '(high)'}`,
      details: { latency, threshold: 5000 },
    };
  } catch (error) {
    return {
      name: 'Network Latency',
      success: false,
      message: `Latency test failed: ${(error as Error).message}`,
    };
  }
}

async function runConnectivityTests() {
  console.log('🔗 Testing Backend Connectivity and CORS Configuration...\n');

  const tests = [
    testHealthEndpoint(),
    testHttpsConnection(),
    testCorsHeaders(),
    testNetworkLatency(),
    ...await testApiEndpoints(),
  ];

  const results = await Promise.all(tests);
  
  console.log('📊 Test Results:\n');
  
  let passedTests = 0;
  let totalTests = results.length;

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.name}: ${result.message}`);
    
    if (result.details) {
      console.log(`   📋 Details:`, JSON.stringify(result.details, null, 2));
    }
    
    if (result.success) passedTests++;
    console.log();
  });

  console.log(`📈 Summary: ${passedTests}/${totalTests} tests passed\n`);

  if (passedTests === totalTests) {
    console.log('🎉 All connectivity tests passed! Backend is ready for production use.');
    return true;
  } else {
    console.log('⚠️  Some connectivity tests failed. Please review the issues above.');
    return false;
  }
}

// Run tests
runConnectivityTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', (error as Error).message);
    process.exit(1);
  });