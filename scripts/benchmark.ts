/**
 * NetPad Performance Benchmark Script
 *
 * Measures performance of key user journeys using Playwright.
 *
 * Usage:
 *   npx tsx scripts/benchmark.ts
 *   BENCHMARK_URL=https://staging.netpad.io npx tsx scripts/benchmark.ts
 *
 * Requirements:
 *   - Playwright installed: npm install -D playwright
 *   - data-testid attributes on key UI elements (see PERFORMANCE_INSTRUMENTATION_SPEC.md)
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';

// ============================================================================
// Types
// ============================================================================

interface BenchmarkConfig {
  baseUrl: string;
  warmupRuns: number;
  measurementRuns: number;
  outputFile: string;
  timeout: number;
  headless: boolean;
}

interface JourneyStep {
  name: string;
  action: (page: Page, baseUrl: string) => Promise<void>;
  waitFor?: string;
}

interface Journey {
  name: string;
  steps: JourneyStep[];
}

interface StepResult {
  name: string;
  durations: number[];
  mean: number;
  p50: number;
  p95: number;
  min: number;
  max: number;
}

interface JourneyResult {
  name: string;
  steps: StepResult[];
  totalMean: number;
  status: 'success' | 'failed';
  error?: string;
}

interface BenchmarkResults {
  timestamp: string;
  config: Omit<BenchmarkConfig, 'timeout' | 'headless'>;
  journeys: JourneyResult[];
  summary: {
    totalJourneys: number;
    successfulJourneys: number;
    failedJourneys: number;
    totalSteps: number;
    slowestStep: { journey: string; step: string; p95: number } | null;
    fastestStep: { journey: string; step: string; p95: number } | null;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: BenchmarkConfig = {
  baseUrl: process.env.BENCHMARK_URL || 'http://localhost:3000',
  warmupRuns: 1,
  measurementRuns: 3,
  outputFile: 'benchmark-results.json',
  timeout: 30000,
  headless: true,
};

// ============================================================================
// User Journeys
// ============================================================================

// App slug for testing - set via BENCHMARK_APP_SLUG env var
// Default: general-default-application (NetPad's default app)
const TEST_APP_SLUG = process.env.BENCHMARK_APP_SLUG || 'general-default-application';

const JOURNEYS: Journey[] = [
  {
    name: 'Template Gallery (Public)',
    steps: [
      {
        name: 'Load Templates Gallery',
        action: async (page, baseUrl) => {
          await page.goto(`${baseUrl}/templates`, { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="templates-gallery"]',
      },
    ],
  },
  {
    name: 'App Dashboard to Forms',
    steps: [
      {
        name: 'Load App Dashboard',
        action: async (page, baseUrl) => {
          await page.goto(`${baseUrl}/apps/${TEST_APP_SLUG}`, { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="dashboard-loaded"]',
      },
      {
        name: 'Navigate to Forms',
        action: async (page, baseUrl) => {
          await page.goto(`${baseUrl}/apps/${TEST_APP_SLUG}/forms`, { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="forms-list"]',
      },
    ],
  },
  {
    name: 'App Dashboard to Workflows',
    steps: [
      {
        name: 'Load App Dashboard',
        action: async (page, baseUrl) => {
          await page.goto(`${baseUrl}/apps/${TEST_APP_SLUG}`, { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="dashboard-loaded"]',
      },
      {
        name: 'Navigate to Workflows',
        action: async (page, baseUrl) => {
          await page.goto(`${baseUrl}/apps/${TEST_APP_SLUG}/workflows`, { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="workflows-list"]',
      },
    ],
  },
  {
    name: 'Settings Page',
    steps: [
      {
        name: 'Load Settings',
        action: async (page, baseUrl) => {
          await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="settings-page"]',
      },
    ],
  },
  {
    name: 'Initial Page Loads',
    steps: [
      {
        name: 'Cold Templates Load',
        action: async (page, baseUrl) => {
          await page.goto(`${baseUrl}/templates`, { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="templates-gallery"]',
      },
      {
        name: 'Cold Settings Load',
        action: async (page, baseUrl) => {
          await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="settings-page"]',
      },
      {
        name: 'Cold App Dashboard Load',
        action: async (page, baseUrl) => {
          await page.goto(`${baseUrl}/apps/${TEST_APP_SLUG}`, { waitUntil: 'networkidle' });
        },
        waitFor: '[data-testid="dashboard-loaded"]',
      },
    ],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function calculateStats(
  durations: number[]
): Omit<StepResult, 'name' | 'durations'> {
  if (durations.length === 0) {
    return { mean: 0, p50: 0, p95: 0, min: 0, max: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    mean: Math.round(sum / sorted.length),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

function getStatusEmoji(p95: number): string {
  if (p95 > 1000) return '🔴';
  if (p95 > 500) return '🟡';
  return '🟢';
}

// ============================================================================
// Authentication Helper
// ============================================================================

async function authenticate(page: Page, config: BenchmarkConfig): Promise<boolean> {
  // NetPad uses magic link authentication, so we skip password-based auth
  // For benchmarking authenticated routes, use a pre-authenticated session cookie
  // or set up a test account with password authentication

  const testEmail = process.env.BENCHMARK_EMAIL;
  const testPassword = process.env.BENCHMARK_PASSWORD;

  if (!testEmail || !testPassword) {
    console.log('⚠️  No BENCHMARK_EMAIL/BENCHMARK_PASSWORD set - skipping auth');
    console.log('   Set these env vars for authenticated benchmarks\n');
    return false;
  }

  try {
    // Navigate to login page (NetPad uses /auth/login)
    await page.goto(`${config.baseUrl}/auth/login`, { waitUntil: 'networkidle' });

    // Check if already logged in (redirected to apps or settings)
    const currentUrl = page.url();
    if (currentUrl.includes('/apps/') || currentUrl.includes('/settings')) {
      return true;
    }

    // NetPad uses magic link auth by default
    // For benchmark testing, you'd need to:
    // 1. Set up a test account with password auth enabled, or
    // 2. Use a pre-authenticated session cookie

    // Try filling in credentials if the form supports it
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.fill(testEmail);

      // Check if there's a password field (for password-enabled accounts)
      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.fill(testPassword);
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          // Wait for navigation
          await page.waitForURL('**/apps/**', { timeout: config.timeout }).catch(() => {
            // If no redirect to apps, check for settings
            return page.waitForURL('**/settings**', { timeout: 5000 });
          });
          return true;
        }
      }
    }

    console.log('   Note: NetPad uses magic link auth - password login may not work');
    return false;
  } catch (error) {
    console.error('Authentication failed:', error);
    return false;
  }
}

// ============================================================================
// Journey Runner
// ============================================================================

async function runJourney(
  browser: Browser,
  journey: Journey,
  config: BenchmarkConfig
): Promise<JourneyResult> {
  const stepResults: Map<string, number[]> = new Map();
  journey.steps.forEach((step) => stepResults.set(step.name, []));

  try {
    // Warmup runs
    for (let i = 0; i < config.warmupRuns; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Authenticate if credentials are set
      await authenticate(page, config);

      for (const step of journey.steps) {
        try {
          await step.action(page, config.baseUrl);
          if (step.waitFor) {
            await page.waitForSelector(step.waitFor, { timeout: config.timeout });
          }
        } catch {
          // Warmup failures are expected if data-testid not set
        }
      }

      await context.close();
    }

    // Measurement runs
    for (let i = 0; i < config.measurementRuns; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Authenticate if credentials are set
      await authenticate(page, config);

      for (const step of journey.steps) {
        const start = performance.now();

        await step.action(page, config.baseUrl);
        if (step.waitFor) {
          await page.waitForSelector(step.waitFor, { timeout: config.timeout });
        }

        const duration = Math.round(performance.now() - start);
        stepResults.get(step.name)!.push(duration);
      }

      await context.close();
    }

    // Calculate results
    const steps: StepResult[] = journey.steps.map((step) => {
      const durations = stepResults.get(step.name)!;
      return {
        name: step.name,
        durations,
        ...calculateStats(durations),
      };
    });

    const totalMean = steps.reduce((sum, s) => sum + s.mean, 0);

    return {
      name: journey.name,
      steps,
      totalMean,
      status: 'success',
    };
  } catch (error) {
    return {
      name: journey.name,
      steps: [],
      totalMean: 0,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Main Benchmark Runner
// ============================================================================

async function runBenchmarks(
  config: BenchmarkConfig = DEFAULT_CONFIG
): Promise<BenchmarkResults> {
  console.log('🚀 Starting NetPad Performance Benchmarks\n');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Warmup runs: ${config.warmupRuns}`);
  console.log(`Measurement runs: ${config.measurementRuns}`);
  console.log(`Headless: ${config.headless}\n`);

  const browser = await chromium.launch({ headless: config.headless });
  const results: JourneyResult[] = [];

  for (const journey of JOURNEYS) {
    console.log(`📍 Running: ${journey.name}`);

    const result = await runJourney(browser, journey, config);
    results.push(result);

    if (result.status === 'success') {
      // Print step results
      result.steps.forEach((step) => {
        const status = getStatusEmoji(step.p95);
        console.log(
          `   ${status} ${step.name}: ${step.mean}ms (p95: ${step.p95}ms)`
        );
      });
      console.log(`   Total: ${result.totalMean}ms\n`);
    } else {
      console.log(`   ❌ Failed: ${result.error}\n`);
    }
  }

  await browser.close();

  // Find slowest and fastest steps
  let slowest: { journey: string; step: string; p95: number } | null = null;
  let fastest: { journey: string; step: string; p95: number } | null = null;

  results
    .filter((j) => j.status === 'success')
    .forEach((journey) => {
      journey.steps.forEach((step) => {
        if (!slowest || step.p95 > slowest.p95) {
          slowest = { journey: journey.name, step: step.name, p95: step.p95 };
        }
        if (!fastest || step.p95 < fastest.p95) {
          fastest = { journey: journey.name, step: step.name, p95: step.p95 };
        }
      });
    });

  const successfulJourneys = results.filter((j) => j.status === 'success');
  const failedJourneys = results.filter((j) => j.status === 'failed');

  const benchmarkResults: BenchmarkResults = {
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: config.baseUrl,
      warmupRuns: config.warmupRuns,
      measurementRuns: config.measurementRuns,
      outputFile: config.outputFile,
    },
    journeys: results,
    summary: {
      totalJourneys: results.length,
      successfulJourneys: successfulJourneys.length,
      failedJourneys: failedJourneys.length,
      totalSteps: successfulJourneys.reduce((sum, j) => sum + j.steps.length, 0),
      slowestStep: slowest,
      fastestStep: fastest,
    },
  };

  // Print summary
  console.log('═'.repeat(60));
  console.log('📊 BENCHMARK SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Journeys tested: ${benchmarkResults.summary.totalJourneys}`);
  console.log(`Successful: ${benchmarkResults.summary.successfulJourneys}`);
  console.log(`Failed: ${benchmarkResults.summary.failedJourneys}`);
  console.log(`Total steps: ${benchmarkResults.summary.totalSteps}`);

  if (slowest) {
    console.log(
      `\n🐢 Slowest: ${slowest.journey} → ${slowest.step}: ${slowest.p95}ms (p95)`
    );
  }
  if (fastest) {
    console.log(
      `⚡ Fastest: ${fastest.journey} → ${fastest.step}: ${fastest.p95}ms (p95)`
    );
  }

  // Save results
  await fs.writeFile(
    config.outputFile,
    JSON.stringify(benchmarkResults, null, 2)
  );
  console.log(`\n💾 Results saved to ${config.outputFile}`);

  // Print failed journeys
  if (failedJourneys.length > 0) {
    console.log('\n⚠️  Some journeys failed. This usually means:');
    console.log('   - data-testid attributes are missing from UI components');
    console.log('   - The app requires authentication');
    console.log('   - Selectors need to be updated');
    console.log('\nSee PERFORMANCE_INSTRUMENTATION_SPEC.md Section 7 for required data-testid list.');
  }

  return benchmarkResults;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

// Parse CLI arguments
const args = process.argv.slice(2);
const configOverrides: Partial<BenchmarkConfig> = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--url' && args[i + 1]) {
    configOverrides.baseUrl = args[++i];
  } else if (arg === '--runs' && args[i + 1]) {
    configOverrides.measurementRuns = parseInt(args[++i], 10);
  } else if (arg === '--output' && args[i + 1]) {
    configOverrides.outputFile = args[++i];
  } else if (arg === '--headed') {
    configOverrides.headless = false;
  } else if (arg === '--help') {
    console.log(`
NetPad Performance Benchmark

Usage: npx tsx scripts/benchmark.ts [options]

Options:
  --url <url>       Base URL to benchmark (default: http://localhost:3000)
  --runs <n>        Number of measurement runs (default: 3)
  --output <file>   Output file for results (default: benchmark-results.json)
  --headed          Run browser in headed mode (visible)
  --help            Show this help message

Environment Variables:
  BENCHMARK_URL       Base URL (alternative to --url)
  BENCHMARK_EMAIL     Email for authentication
  BENCHMARK_PASSWORD  Password for authentication

Examples:
  npx tsx scripts/benchmark.ts
  npx tsx scripts/benchmark.ts --url https://staging.netpad.io --runs 5
  BENCHMARK_URL=https://staging.netpad.io npx tsx scripts/benchmark.ts
`);
    process.exit(0);
  }
}

runBenchmarks({ ...DEFAULT_CONFIG, ...configOverrides }).catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
