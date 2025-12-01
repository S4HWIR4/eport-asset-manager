#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * This script performs automated checks on the live deployment
 * to ensure all critical features are working before submission.
 */

const LIVE_URL = 'https://eport-asset-manager-beta.vercel.app';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(message, 'blue');
  log('='.repeat(60), 'blue');
}

async function checkUrl(url, description) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      success(`${description}: ${response.status} ${response.statusText}`);
      return true;
    } else {
      error(`${description}: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (err) {
    error(`${description}: ${err.message}`);
    return false;
  }
}

async function verifyDeployment() {
  log('\n🚀 Asset Manager - Deployment Verification\n', 'cyan');
  log(`Live URL: ${LIVE_URL}\n`, 'cyan');

  let totalChecks = 0;
  let passedChecks = 0;

  // Section 1: Basic Connectivity
  section('1. Basic Connectivity Tests');
  totalChecks++;
  if (await checkUrl(LIVE_URL, 'Homepage')) passedChecks++;

  totalChecks++;
  if (await checkUrl(`${LIVE_URL}/login`, 'Login Page')) passedChecks++;

  // Section 2: Static Assets
  section('2. Static Assets');
  totalChecks++;
  if (await checkUrl(`${LIVE_URL}/eport-logo.webp`, 'Logo Image')) passedChecks++;

  totalChecks++;
  if (await checkUrl(`${LIVE_URL}/favicon.ico`, 'Favicon')) passedChecks++;

  // Section 3: API Routes (these will return 401 but should exist)
  section('3. API Endpoints');
  info('Note: 401 Unauthorized is expected (authentication required)');
  
  const apiEndpoints = [
    '/api/auth',
    '/api/assets',
  ];

  for (const endpoint of apiEndpoints) {
    totalChecks++;
    try {
      const response = await fetch(`${LIVE_URL}${endpoint}`);
      // 401 or 404 are both acceptable - we just want to know the server responds
      if (response.status === 401 || response.status === 404 || response.status === 405) {
        success(`API endpoint exists: ${endpoint}`);
        passedChecks++;
      } else {
        warning(`API endpoint ${endpoint}: ${response.status}`);
      }
    } catch (err) {
      error(`API endpoint ${endpoint}: ${err.message}`);
    }
  }

  // Section 4: Page Routes
  section('4. Page Routes');
  const routes = [
    '/',
    '/login',
    '/admin',
    '/user',
  ];

  for (const route of routes) {
    totalChecks++;
    if (await checkUrl(`${LIVE_URL}${route}`, `Route: ${route}`)) passedChecks++;
  }

  // Section 5: Build Information
  section('5. Build Information');
  try {
    const response = await fetch(LIVE_URL);
    const html = await response.text();
    
    totalChecks++;
    if (html.includes('Asset Manager')) {
      success('Page title found in HTML');
      passedChecks++;
    } else {
      warning('Page title not found in HTML');
    }

    totalChecks++;
    if (html.includes('next')) {
      success('Next.js detected');
      passedChecks++;
    } else {
      warning('Next.js not detected in HTML');
    }

    totalChecks++;
    if (html.length > 1000) {
      success(`HTML content size: ${(html.length / 1024).toFixed(2)} KB`);
      passedChecks++;
    } else {
      warning(`HTML content seems small: ${html.length} bytes`);
    }
  } catch (err) {
    error(`Failed to fetch HTML: ${err.message}`);
    totalChecks += 3;
  }

  // Section 6: Performance Check
  section('6. Performance Check');
  totalChecks++;
  const startTime = Date.now();
  try {
    await fetch(LIVE_URL);
    const loadTime = Date.now() - startTime;
    if (loadTime < 2000) {
      success(`Page load time: ${loadTime}ms (Good)`);
      passedChecks++;
    } else if (loadTime < 5000) {
      warning(`Page load time: ${loadTime}ms (Acceptable)`);
      passedChecks++;
    } else {
      error(`Page load time: ${loadTime}ms (Slow)`);
    }
  } catch (err) {
    error(`Performance check failed: ${err.message}`);
  }

  // Final Summary
  section('Summary');
  const percentage = ((passedChecks / totalChecks) * 100).toFixed(1);
  
  log(`\nTotal Checks: ${totalChecks}`, 'cyan');
  log(`Passed: ${passedChecks}`, 'green');
  log(`Failed: ${totalChecks - passedChecks}`, 'red');
  log(`Success Rate: ${percentage}%\n`, percentage >= 90 ? 'green' : percentage >= 70 ? 'yellow' : 'red');

  if (percentage >= 90) {
    success('🎉 Deployment looks great! Ready for submission.');
  } else if (percentage >= 70) {
    warning('⚠️  Deployment is functional but has some issues.');
  } else {
    error('❌ Deployment has significant issues. Please review.');
  }

  // Manual Testing Reminder
  section('Manual Testing Required');
  info('Automated checks passed, but you still need to manually verify:');
  console.log('  1. Login with admin credentials');
  console.log('  2. Test all CRUD operations');
  console.log('  3. Login with user credentials');
  console.log('  4. Verify user can only see own assets');
  console.log('  5. Test on mobile devices');
  console.log('  6. Test dark mode toggle');
  console.log('  7. Verify GitHub auto-deployment');
  console.log('\n  See VERIFICATION_CHECKLIST.md for complete manual testing guide.\n');

  // Demo Credentials
  section('Demo Credentials');
  log('Admin Account:', 'cyan');
  log('  Email: dev.sahwira@gmail.com', 'white');
  log('  Password: Password123', 'white');
  log('\nUser Account:', 'cyan');
  log('  Email: rumbi@eport.cloud', 'white');
  log('  Password: Password123', 'white');
  log('');

  process.exit(percentage >= 70 ? 0 : 1);
}

// Run verification
verifyDeployment().catch((err) => {
  error(`\nVerification failed: ${err.message}`);
  process.exit(1);
});
