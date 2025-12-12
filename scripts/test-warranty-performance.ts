/**
 * Performance Testing Script for Warranty System
 * Tests API response times, bundle size impact, and loading performance
 */

import { getWarrantyApiClient } from '../lib/warranty-api-client';
import { performance } from 'perf_hooks';

interface PerformanceMetric {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  successRate: number;
  errors: string[];
}

interface PerformanceTestSuite {
  suiteName: string;
  metrics: PerformanceMetric[];
  totalDuration: number;
  summary: {
    totalOperations: number;
    averageResponseTime: number;
    overallSuccessRate: number;
  };
}

class WarrantyPerformanceTester {
  private apiClient = getWarrantyApiClient();

  /**
   * Run all performance tests
   */
  async runPerformanceTests(): Promise<PerformanceTestSuite> {
    console.log('⚡ Starting Warranty System Performance Tests...\n');
    
    const startTime = performance.now();
    const metrics: PerformanceMetric[] = [];

    // Test API response times
    metrics.push(await this.testApiResponseTimes());
    
    // Test with large datasets
    metrics.push(await this.testLargeDatasetPerformance());
    
    // Test concurrent operations
    metrics.push(await this.testConcurrentOperations());
    
    // Test caching performance
    metrics.push(await this.testCachingPerformance());

    const totalDuration = performance.now() - startTime;

    // Calculate summary
    const totalOperations = metrics.reduce((sum, m) => sum + m.iterations, 0);
    const averageResponseTime = metrics.reduce((sum, m) => sum + (m.averageTime * m.iterations), 0) / totalOperations;
    const overallSuccessRate = metrics.reduce((sum, m) => sum + (m.successRate * m.iterations), 0) / totalOperations;

    const suite: PerformanceTestSuite = {
      suiteName: 'Warranty System Performance Tests',
      metrics,
      totalDuration,
      summary: {
        totalOperations,
        averageResponseTime,
        overallSuccessRate,
      },
    };

    this.printPerformanceResults(suite);
    return suite;
  }

  /**
   * Test API response times under normal load
   */
  private async testApiResponseTimes(): Promise<PerformanceMetric> {
    console.log('📊 Testing API Response Times...');
    
    const iterations = 20;
    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        // Test warranty status check (most common operation)
        await this.apiClient.checkWarrantyStatus(`test_asset_${i}`);
        const duration = performance.now() - startTime;
        times.push(duration);
        successCount++;
      } catch (error) {
        const duration = performance.now() - startTime;
        times.push(duration);
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      operation: 'Warranty Status Check',
      averageTime: times.reduce((sum, t) => sum + t, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      iterations,
      successRate: successCount / iterations,
      errors,
    };
  }

  /**
   * Test performance with large datasets
   */
  private async testLargeDatasetPerformance(): Promise<PerformanceMetric> {
    console.log('📈 Testing Large Dataset Performance...');
    
    const iterations = 5;
    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        // Test getting all warranty registrations (potentially large dataset)
        await this.apiClient.getWarrantyRegistrations();
        const duration = performance.now() - startTime;
        times.push(duration);
        successCount++;
      } catch (error) {
        const duration = performance.now() - startTime;
        times.push(duration);
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      operation: 'Get All Warranty Registrations',
      averageTime: times.reduce((sum, t) => sum + t, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      iterations,
      successRate: successCount / iterations,
      errors,
    };
  }

  /**
   * Test concurrent operations performance
   */
  private async testConcurrentOperations(): Promise<PerformanceMetric> {
    console.log('🔄 Testing Concurrent Operations...');
    
    const concurrentRequests = 10;
    const iterations = 3; // 3 batches of concurrent requests
    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;

    for (let batch = 0; batch < iterations; batch++) {
      const startTime = performance.now();
      
      try {
        // Create concurrent warranty status checks
        const promises = Array.from({ length: concurrentRequests }, (_, i) =>
          this.apiClient.checkWarrantyStatus(`concurrent_test_${batch}_${i}`)
        );

        await Promise.all(promises);
        const duration = performance.now() - startTime;
        times.push(duration);
        successCount++;
      } catch (error) {
        const duration = performance.now() - startTime;
        times.push(duration);
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      operation: `${concurrentRequests} Concurrent Status Checks`,
      averageTime: times.reduce((sum, t) => sum + t, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      iterations,
      successRate: successCount / iterations,
      errors,
    };
  }

  /**
   * Test caching performance
   */
  private async testCachingPerformance(): Promise<PerformanceMetric> {
    console.log('💾 Testing Caching Performance...');
    
    const testAssetId = `cache_test_${Date.now()}`;
    const iterations = 10;
    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;

    // First request (cache miss)
    try {
      await this.apiClient.checkWarrantyStatus(testAssetId);
    } catch (error) {
      // Ignore first request errors
    }

    // Subsequent requests (should benefit from any caching)
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await this.apiClient.checkWarrantyStatus(testAssetId);
        const duration = performance.now() - startTime;
        times.push(duration);
        successCount++;
      } catch (error) {
        const duration = performance.now() - startTime;
        times.push(duration);
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      operation: 'Cached Status Checks',
      averageTime: times.reduce((sum, t) => sum + t, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      iterations,
      successRate: successCount / iterations,
      errors,
    };
  }

  /**
   * Print performance test results
   */
  private printPerformanceResults(suite: PerformanceTestSuite): void {
    console.log('\n' + '='.repeat(80));
    console.log(`⚡ ${suite.suiteName} Results`);
    console.log('='.repeat(80));
    
    suite.metrics.forEach(metric => {
      console.log(`\n📊 ${metric.operation}:`);
      console.log(`  Average Response Time: ${metric.averageTime.toFixed(2)}ms`);
      console.log(`  Min Response Time: ${metric.minTime.toFixed(2)}ms`);
      console.log(`  Max Response Time: ${metric.maxTime.toFixed(2)}ms`);
      console.log(`  Success Rate: ${(metric.successRate * 100).toFixed(1)}%`);
      console.log(`  Iterations: ${metric.iterations}`);
      
      if (metric.errors.length > 0) {
        console.log(`  Errors: ${metric.errors.length}`);
        metric.errors.slice(0, 3).forEach(error => {
          console.log(`    - ${error}`);
        });
        if (metric.errors.length > 3) {
          console.log(`    ... and ${metric.errors.length - 3} more`);
        }
      }
    });

    console.log('\n📈 Performance Summary:');
    console.log(`  Total Operations: ${suite.summary.totalOperations}`);
    console.log(`  Average Response Time: ${suite.summary.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Overall Success Rate: ${(suite.summary.overallSuccessRate * 100).toFixed(1)}%`);
    console.log(`  Total Test Duration: ${suite.totalDuration.toFixed(2)}ms`);

    // Performance benchmarks
    console.log('\n🎯 Performance Benchmarks:');
    const avgTime = suite.summary.averageResponseTime;
    if (avgTime < 500) {
      console.log('  ✅ Excellent performance (< 500ms average)');
    } else if (avgTime < 1000) {
      console.log('  ✅ Good performance (< 1000ms average)');
    } else if (avgTime < 2000) {
      console.log('  ⚠️ Acceptable performance (< 2000ms average)');
    } else {
      console.log('  ❌ Poor performance (> 2000ms average)');
    }

    if (suite.summary.overallSuccessRate > 0.95) {
      console.log('  ✅ Excellent reliability (> 95% success rate)');
    } else if (suite.summary.overallSuccessRate > 0.90) {
      console.log('  ✅ Good reliability (> 90% success rate)');
    } else {
      console.log('  ⚠️ Reliability concerns (< 90% success rate)');
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

/**
 * Bundle size analysis
 */
async function analyzeBundleSize(): Promise<void> {
  console.log('\n📦 Analyzing Bundle Size Impact...');
  
  try {
    // Check if build exists
    const fs = require('fs');
    const path = require('path');
    
    const buildDir = path.join(process.cwd(), '.next');
    if (!fs.existsSync(buildDir)) {
      console.log('  ⚠️ No build found. Run "npm run build" first.');
      return;
    }

    // Look for warranty-related chunks
    const staticDir = path.join(buildDir, 'static');
    if (fs.existsSync(staticDir)) {
      const chunks = fs.readdirSync(staticDir, { recursive: true })
        .filter((file: string) => file.includes('warranty') || file.includes('zustand'))
        .map((file: string) => {
          const filePath = path.join(staticDir, file);
          const stats = fs.statSync(filePath);
          return {
            file,
            size: stats.size,
            sizeKB: (stats.size / 1024).toFixed(2),
          };
        });

      if (chunks.length > 0) {
        console.log('  📊 Warranty-related bundle chunks:');
        chunks.forEach((chunk: { file: string; sizeKB: string }) => {
          console.log(`    - ${chunk.file}: ${chunk.sizeKB} KB`);
        });
        
        const totalSize = chunks.reduce((sum: number, chunk: { size: number }) => sum + chunk.size, 0);
        console.log(`  📦 Total warranty features size: ${(totalSize / 1024).toFixed(2)} KB`);
      } else {
        console.log('  ✅ No separate warranty chunks found (code is well-integrated)');
      }
    }
  } catch (error) {
    console.log(`  ⚠️ Bundle analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  const tester = new WarrantyPerformanceTester();
  
  try {
    const results = await tester.runPerformanceTests();
    await analyzeBundleSize();
    
    // Exit with appropriate code based on performance
    const avgTime = results.summary.averageResponseTime;
    const successRate = results.summary.overallSuccessRate;
    
    if (avgTime > 2000 || successRate < 0.90) {
      console.log('\n❌ Performance tests indicate issues that should be addressed.');
      process.exit(1);
    } else {
      console.log('\n✅ Performance tests passed successfully.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Performance test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { WarrantyPerformanceTester, type PerformanceTestSuite, type PerformanceMetric };