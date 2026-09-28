import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

/**
 * End-to-end smoke tests against the production build (`vite preview`), the
 * automated form of CONTRIBUTING's manual checklist. `npm run test:e2e`
 * builds first. Set PW_CHROMIUM_PATH to use a preinstalled Chromium instead
 * of `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
