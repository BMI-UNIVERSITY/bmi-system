/**
 * Performance Testing Script
 * Tests the registration and application submission performance improvements
 */

import { Env } from '../lib/types';
import { executeWithMonitoring, getPerformanceMetrics, analyzePerformance } from '../lib/performance';

interface PerformanceTestResult {
  testName: string;
  duration: number;
  success: boolean;
  iterations: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
}

class PerformanceTester {
  constructor(private env: Env) {}

  async runAllTests(): Promise<{
    summary: string;
    results: PerformanceTestResult[];
    recommendations: string[];
  }> {
    console.log('🚀 Starting performance tests...\n');
    
    const results: PerformanceTestResult[] = [];
    
    // Test 1: User lookup performance (common in registration/login)
    results.push(await this.testUserLookup());
    
    // Test 2: Application queries performance
    results.push(await this.testApplicationQueries());
    
    // Test 3: Batch operations performance
    results.push(await this.testBatchOperations());
    
    // Test 4: Index utilization test
    results.push(await this.testIndexPerformance());
    
    // Test 5: Session management performance
    results.push(await this.testSessionOperations());
    
    // Analyze results
    const metrics = getPerformanceMetrics();
    const analysis = analyzePerformance();
    
    const summary = this.generateSummary(results);
    const recommendations = this.generateRecommendations(results, analysis);
    
    return { summary, results, recommendations };
  }

  private async testUserLookup(): Promise<PerformanceTestResult> {
    console.log('📧 Testing user lookup performance...');
    const iterations = 50;
    const times: number[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      try {
        // Test the optimized user lookup with index
        const result = await executeWithMonitoring(
          this.env.DB.prepare('SELECT id, email, first_name, last_name, role, is_verified FROM users WHERE email = ? LIMIT 1')
            .bind(`test${i % 10}@example.com`), // Cycle through test emails
          'perf_test_user_lookup'
        );
        const endTime = performance.now();
        times.push(endTime - startTime);
        successCount++;
      } catch (e) {
        console.error(`User lookup test ${i} failed:`, e);
      }
    }

    return {
      testName: 'User Email Lookup',
      duration: times.reduce((sum, time) => sum + time, 0),
      success: successCount === iterations,
      iterations,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }

  private async testApplicationQueries(): Promise<PerformanceTestResult> {
    console.log('📋 Testing application query performance...');
    const iterations = 30;
    const times: number[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      try {
        // Test application queries with new indexes
        const result = await executeWithMonitoring(
          this.env.DB.prepare(`
            SELECT a.id, a.program, a.degree_level, a.status, a.submitted_at,
                   u.first_name, u.last_name, u.email
            FROM applications a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.status = 'submitted' 
            ORDER BY a.submitted_at DESC 
            LIMIT 10
          `),
          'perf_test_application_query'
        );
        const endTime = performance.now();
        times.push(endTime - startTime);
        successCount++;
      } catch (e) {
        console.error(`Application query test ${i} failed:`, e);
      }
    }

    return {
      testName: 'Application Queries',
      duration: times.reduce((sum, time) => sum + time, 0),
      success: successCount === iterations,
      iterations,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }

  private async testBatchOperations(): Promise<PerformanceTestResult> {
    console.log('🔄 Testing batch operations performance...');
    const times: number[] = [];
    let successCount = 0;

    // Test smaller batches to avoid overwhelming the test DB
    const batches = [5, 10, 15];
    
    for (const batchSize of batches) {
      const startTime = performance.now();
      try {
        // Create test batch operations
        const operations = [];
        for (let i = 0; i < batchSize; i++) {
          operations.push(
            this.env.DB.prepare('SELECT COUNT(*) FROM users WHERE role = ?').bind('applicant')
          );
        }

        // Execute batch
        await this.env.DB.batch(operations);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        successCount++;
      } catch (e) {
        console.error(`Batch operation test (${batchSize}) failed:`, e);
      }
    }

    return {
      testName: 'Batch Operations',
      duration: times.reduce((sum, time) => sum + time, 0),
      success: successCount === batches.length,
      iterations: batches.length,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }

  private async testIndexPerformance(): Promise<PerformanceTestResult> {
    console.log('🔍 Testing index utilization...');
    const iterations = 20;
    const times: number[] = [];
    let successCount = 0;

    const testQueries = [
      // Test compound index on users
      'SELECT COUNT(*) FROM users WHERE role = \'applicant\' AND is_verified = 1',
      // Test application indexes
      'SELECT COUNT(*) FROM applications WHERE status = \'submitted\' AND program = \'Computer Science\'',
      // Test session cleanup index
      'SELECT COUNT(*) FROM sessions WHERE expires_at > datetime(\'now\')',
      // Test lifecycle events index
      'SELECT COUNT(*) FROM lifecycle_events WHERE status = \'completed\' AND stage = \'student_active\'',
    ];

    for (let i = 0; i < iterations; i++) {
      const query = testQueries[i % testQueries.length];
      const startTime = performance.now();
      try {
        await executeWithMonitoring(
          this.env.DB.prepare(query),
          'perf_test_index_utilization'
        );
        const endTime = performance.now();
        times.push(endTime - startTime);
        successCount++;
      } catch (e) {
        console.error(`Index test ${i} failed:`, e);
      }
    }

    return {
      testName: 'Index Utilization',
      duration: times.reduce((sum, time) => sum + time, 0),
      success: successCount === iterations,
      iterations,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }

  private async testSessionOperations(): Promise<PerformanceTestResult> {
    console.log('🔐 Testing session management performance...');
    const iterations = 25;
    const times: number[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      try {
        // Test session lookup and cleanup operations
        const sessionId = `test-session-${i}`;
        const userId = `test-user-${i % 5}`; // Cycle through test users
        const expiresAt = new Date(Date.now() + 3600000).toISOString();

        // Insert test session
        await executeWithMonitoring(
          this.env.DB.prepare('INSERT OR REPLACE INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
            .bind(sessionId, userId, expiresAt),
          'perf_test_session_insert'
        );

        // Lookup session (this uses the expires + user index)
        await executeWithMonitoring(
          this.env.DB.prepare('SELECT id FROM sessions WHERE expires_at > datetime(\'now\') AND user_id = ?')
            .bind(userId),
          'perf_test_session_lookup'
        );

        const endTime = performance.now();
        times.push(endTime - startTime);
        successCount++;
      } catch (e) {
        console.error(`Session operation test ${i} failed:`, e);
      }
    }

    // Cleanup test sessions
    try {
      await this.env.DB.prepare('DELETE FROM sessions WHERE id LIKE \'test-session-%\'').run();
    } catch (e) {
      console.error('Failed to cleanup test sessions:', e);
    }

    return {
      testName: 'Session Operations',
      duration: times.reduce((sum, time) => sum + time, 0),
      success: successCount === iterations,
      iterations,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }

  private generateSummary(results: PerformanceTestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const totalAvgTime = results.reduce((sum, r) => sum + r.avgTime, 0) / results.length;
    
    return `Performance Tests: ${passedTests}/${totalTests} passed, Avg: ${totalAvgTime.toFixed(2)}ms`;
  }

  private generateRecommendations(results: PerformanceTestResult[], analysis: any): string[] {
    const recommendations: string[] = [];
    
    // Check for slow tests
    const slowTests = results.filter(r => r.avgTime > 50);
    if (slowTests.length > 0) {
      recommendations.push(`Slow tests detected: ${slowTests.map(t => t.testName).join(', ')} - consider further optimization`);
    }

    // Check for failed tests
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push(`Failed tests: ${failedTests.map(t => t.testName).join(', ')} - investigate errors`);
    }

    // Check for high variance
    const highVarianceTests = results.filter(r => (r.maxTime - r.minTime) > r.avgTime);
    if (highVarianceTests.length > 0) {
      recommendations.push(`High performance variance in: ${highVarianceTests.map(t => t.testName).join(', ')} - check for inconsistent query plans`);
    }

    // Add general recommendations
    if (results.every(r => r.avgTime < 25)) {
      recommendations.push('✅ All tests performing well - good index utilization detected');
    }

    // Include analysis recommendations
    recommendations.push(...analysis.recommendations);

    return recommendations;
  }

  printResults(summary: string, results: PerformanceTestResult[], recommendations: string[]): void {
    console.log('\n📊 Performance Test Results');
    console.log('═'.repeat(50));
    console.log(`Summary: ${summary}\n`);

    console.log('Individual Test Results:');
    console.log('┌─' + '─'.repeat(25) + '─┬─' + '─'.repeat(10) + '─┬─' + '─'.repeat(10) + '─┬─' + '─'.repeat(10) + '─┐');
    console.log('│ Test Name               │ Avg (ms)   │ Min (ms)   │ Max (ms)   │');
    console.log('├─' + '─'.repeat(25) + '─┼─' + '─'.repeat(10) + '─┼─' + '─'.repeat(10) + '─┼─' + '─'.repeat(10) + '─┤');
    
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      const name = `${status} ${result.testName}`.padEnd(25);
      const avg = result.avgTime.toFixed(2).padStart(10);
      const min = result.minTime.toFixed(2).padStart(10);
      const max = result.maxTime.toFixed(2).padStart(10);
      console.log(`│ ${name} │ ${avg} │ ${min} │ ${max} │`);
    }
    console.log('└─' + '─'.repeat(25) + '─┴─' + '─'.repeat(10) + '─┴─' + '─'.repeat(10) + '─┴─' + '─'.repeat(10) + '─┘');

    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      for (const rec of recommendations) {
        console.log(`  • ${rec}`);
      }
    }

    console.log('\n✅ Performance testing completed!');
  }
}

// Export for use in other scripts
export { PerformanceTester };

// If run directly, execute the tests
if (import.meta.main) {
  console.log('This script should be run within the Cloudflare Workers environment');
  console.log('Use: npx wrangler dev and call the performance endpoints');
}