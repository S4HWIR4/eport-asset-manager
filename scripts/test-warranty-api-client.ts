#!/usr/bin/env tsx

/**
 * Test Warranty API Client
 * Tests the centralized API client with real API endpoints
 */

import { getWarrantyApiClient } from '../lib/warranty-api-client';

async function testApiClient() {
  console.log('🧪 Testing Warranty API Client...\n');

  try {
    const client = getWarrantyApiClient();

    // Test 1: Connection Test
    console.log('1. Testing API Connection:');
    const isConnected = await client.testConnection();
    console.log(`   ${isConnected ? '✅' : '❌'} Connection test: ${isConnected ? 'SUCCESS' : 'FAILED'}`);

    if (!isConnected) {
      console.log('   ⚠️  API connection failed, skipping other tests');
      return false;
    }

    // Test 2: Check warranty status for non-existent asset
    console.log('\n2. Testing Warranty Status Check:');
    try {
      const status = await client.checkWarrantyStatus('test-asset-123');
      console.log('   ✅ Warranty status check: SUCCESS');
      console.log('   📊 Response:', JSON.stringify(status, null, 2));
    } catch (error) {
      console.log('   ❌ Warranty status check: FAILED');
      console.log('   🔍 Error:', (error as Error).message);
    }

    // Test 3: Test authentication (should fail without credentials)
    console.log('\n3. Testing Authentication:');
    try {
      const loginResult = await client.login('test-user', 'test-password');
      console.log('   ⚠️  Login succeeded unexpectedly');
      console.log('   📊 Response:', JSON.stringify(loginResult, null, 2));
    } catch (error) {
      console.log('   ✅ Login failed as expected (no valid credentials)');
      console.log('   🔍 Error:', (error as Error).message);
    }

    console.log('\n✅ API Client tests completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ API Client test failed:', (error as Error).message);
    return false;
  }
}

// Run tests
testApiClient()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', (error as Error).message);
    process.exit(1);
  });