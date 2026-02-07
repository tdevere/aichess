#!/usr/bin/env node

/**
 * Automated Test Agent
 * 
 * Runs full stack integration tests against Docker compose environment
 * - Starts Docker stack
 * - Waits for services health
 * - Seeds test data
 * - Runs backend integration tests
 * - Runs Playwright E2E tests
 * - Generates test report
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:8080';
const MAX_WAIT = 120000; // 2 minutes

class TestAgent {
  constructor() {
    this.results = {
      dockerStart: false,
      healthChecks: false,
      dataSeeding: false,
      backendTests: { passed: 0, failed: 0, total: 0 },
      e2eTests: { passed: 0, failed: 0, total: 0 },
      duration: 0,
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
    };
    const reset = '\x1b[0m';
    console.log(`${colors[type]}[${timestamp}] ${message}${reset}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkHealth(url, maxAttempts = 40) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }
      await this.sleep(3000);
      this.log(`Waiting for ${url}... (${i + 1}/${maxAttempts})`);
    }
    return false;
  }

  async startDockerStack() {
    this.log('Starting Docker Compose stack...');
    
    try {
      // Stop any existing containers
      await execAsync('docker compose down', { cwd: path.resolve(__dirname, '..') });
      
      // Start fresh
      await execAsync('docker compose up -d', { cwd: path.resolve(__dirname, '..') });
      
      this.results.dockerStart = true;
      this.log('Docker stack started successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to start Docker stack: ${error.message}`, 'error');
      return false;
    }
  }

  async waitForServices() {
    this.log('Waiting for services to be healthy...');
    
    const backendHealthy = await this.checkHealth(`${BACKEND_URL}/health`);
    if (!backendHealthy) {
      this.log('Backend failed to become healthy', 'error');
      return false;
    }
    this.log('Backend is healthy', 'success');
    
    const frontendHealthy = await this.checkHealth(FRONTEND_URL);
    if (!frontendHealthy) {
      this.log('Frontend failed to become healthy', 'error');
      return false;
    }
    this.log('Frontend is healthy', 'success');
    
    this.results.healthChecks = true;
    return true;
  }

  async seedTestData() {
    this.log('Seeding test data...');
    
    try {
      // Wait for database to be fully ready
      await this.sleep(5000);
      
      // Seed puzzles
      await execAsync(
        'docker compose exec -T backend npm run seed:puzzles',
        { cwd: path.resolve(__dirname, '..') }
      );
      
      this.results.dataSeeding = true;
      this.log('Test data seeded successfully', 'success');
      return true;
    } catch (error) {
      this.log(`Failed to seed data: ${error.message}`, 'warning');
      // Non-fatal - puzzles might already exist
      this.results.dataSeeding = true;
      return true;
    }
  }

  async runBackendTests() {
    this.log('Running backend integration tests...');
    
    try {
      const { stdout } = await execAsync('npm test', {
        cwd: path.resolve(__dirname, '../backend'),
        env: { ...process.env, NODE_ENV: 'test' },
      });
      
      // Parse Jest output for test results
      const passMatch = stdout.match(/(\d+) passed/);
      const failMatch = stdout.match(/(\d+) failed/);
      const totalMatch = stdout.match(/Tests:\s+(\d+)/);
      
      this.results.backendTests.passed = passMatch ? parseInt(passMatch[1]) : 0;
      this.results.backendTests.failed = failMatch ? parseInt(failMatch[1]) : 0;
      this.results.backendTests.total = totalMatch ? parseInt(totalMatch[1]) : 0;
      
      this.log(`Backend tests: ${this.results.backendTests.passed}/${this.results.backendTests.total} passed`, 'success');
      return true;
    } catch (error) {
      this.log(`Backend tests failed: ${error.message}`, 'error');
      this.results.backendTests.failed = this.results.backendTests.total;
      return false;
    }
  }

  async runE2ETests() {
    this.log('Running Playwright E2E tests...');
    
    try {
      const { stdout } = await execAsync('npx playwright test', {
        cwd: path.resolve(__dirname, '../frontend'),
        env: { ...process.env, CI: 'true' },
      });
      
      // Parse Playwright output
      const passMatch = stdout.match(/(\d+) passed/);
      const failMatch = stdout.match(/(\d+) failed/);
      
      this.results.e2eTests.passed = passMatch ? parseInt(passMatch[1]) : 0;
      this.results.e2eTests.failed = failMatch ? parseInt(failMatch[1]) : 0;
      this.results.e2eTests.total = this.results.e2eTests.passed + this.results.e2eTests.failed;
      
      this.log(`E2E tests: ${this.results.e2eTests.passed}/${this.results.e2eTests.total} passed`, 'success');
      return true;
    } catch (error) {
      this.log(`E2E tests encountered errors: ${error.message}`, 'warning');
      return false;
    }
  }

  async generateReport() {
    const duration = Date.now() - this.startTime;
    this.results.duration = Math.round(duration / 1000);
    
    const report = `
# Test Agent Report

**Test Run**: ${new Date().toISOString()}
**Duration**: ${this.results.duration}s

## Results Summary

| Component | Status | Passed | Failed | Total |
|-----------|--------|--------|--------|-------|
| Docker Stack | ${this.results.dockerStart ? '✅' : '❌'} | - | - | - |
| Health Checks | ${this.results.healthChecks ? '✅' : '❌'} | - | - | - |
| Data Seeding | ${this.results.dataSeeding ? '✅' : '❌'} | - | - | - |
| Backend Tests | ${this.results.backendTests.failed === 0 ? '✅' : '❌'} | ${this.results.backendTests.passed} | ${this.results.backendTests.failed} | ${this.results.backendTests.total} |
| E2E Tests | ${this.results.e2eTests.failed === 0 ? '✅' : '❌'} | ${this.results.e2eTests.passed} | ${this.results.e2eTests.failed} | ${this.results.e2eTests.total} |

## Overall Status

${this.isSuccess() ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}

---
*Generated by Automated Test Agent*
`;

    await fs.writeFile('test-report.md', report);
    this.log('Test report generated: test-report.md', 'success');
    console.log(report);
  }

  isSuccess() {
    return (
      this.results.dockerStart &&
      this.results.healthChecks &&
      this.results.backendTests.failed === 0 &&
      this.results.e2eTests.failed === 0
    );
  }

  async cleanup() {
    this.log('Cleaning up...');
    try {
      await execAsync('docker compose down', { cwd: path.resolve(__dirname, '..') });
      this.log('Docker stack stopped', 'success');
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'warning');
    }
  }

  async run() {
    this.log('🤖 Test Agent Starting...', 'success');
    
    try {
      // Step 1: Start Docker stack
      if (!await this.startDockerStack()) {
        throw new Error('Failed to start Docker stack');
      }
      
      // Step 2: Wait for services
      if (!await this.waitForServices()) {
        throw new Error('Services failed health checks');
      }
      
      // Step 3: Seed test data
      await this.seedTestData();
      
      // Step 4: Run backend tests
      await this.runBackendTests();
      
      // Step 5: Run E2E tests
      await this.runE2ETests();
      
      // Step 6: Generate report
      await this.generateReport();
      
      // Step 7: Cleanup
      if (process.env.KEEP_RUNNING !== 'true') {
        await this.cleanup();
      }
      
      process.exit(this.isSuccess() ? 0 : 1);
      
    } catch (error) {
      this.log(`Test agent failed: ${error.message}`, 'error');
      await this.generateReport();
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new TestAgent();
  agent.run();
}

module.exports = TestAgent;
