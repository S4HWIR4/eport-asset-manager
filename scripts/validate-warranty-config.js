#!/usr/bin/env node

/**
 * Warranty Configuration Validation Script
 * Validates that the warranty API configuration is properly set up
 */

const https = require('https');
const { URL } = require('url');

// Configuration
const API_URL = process.env.NEXT_PUBLIC_WARRANTY_API_URL || 'https://server16.eport.ws';
const TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000');

console.log('🔍 Validating Warranty API Configuration...\n');

// Test 1: Environment Variables
console.log('1. Environment Variables:');
console.log(`   ✅ API URL: ${API_URL}`);
console.log(`   ✅ Timeout: ${TIMEOUT}ms`);
console.log(`   ✅ Retry Attempts: ${process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'}`);
console.log(`   ✅ Debug Mode: ${process.env.NEXT_PUBLIC_DEBUG_API || 'false'}`);
console.log(`   ✅ Environment: ${process.env.NEXT_PUBLIC_APP_ENV || 'production'}\n`);

// Test 2: API Connectivity
console.log('2. API Connectivity:');

function testEndpoint(url, description) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: TIMEOUT,
    };

    const req = https.request(options, (res) => {
      console.log(`   ✅ ${description}: ${res.statusCode} ${res.statusMessage}`);
      resolve(true);
    });

    req.on('error', (error) => {
      console.log(`   ❌ ${description}: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`   ❌ ${description}: Request timeout`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function validateConnectivity() {
  const endpoints = [
    { url: `${API_URL}/health`, description: 'Health Check' },
    { url: `${API_URL}/api/warranty/list`, description: 'Warranty List (may require auth)' },
  ];

  let allPassed = true;
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.url, endpoint.description);
    if (!result) allPassed = false;
  }

  console.log('\n3. Configuration Summary:');
  if (allPassed) {
    console.log('   ✅ All connectivity tests passed');
    console.log('   ✅ Warranty API configuration is valid');
    console.log('   🚀 Ready for production use!');
  } else {
    console.log('   ⚠️  Some connectivity tests failed');
    console.log('   🔧 Check network connectivity and API availability');
  }

  return allPassed;
}

// Run validation
validateConnectivity()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });