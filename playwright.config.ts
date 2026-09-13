import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:5274',
    browserName: 'chromium',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'desktop', use: { viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command:
      'npm run build -w @canvas/contracts && npm run build -w @canvas/api && node scripts/e2e-server.mjs',
    url: 'http://127.0.0.1:5274',
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
