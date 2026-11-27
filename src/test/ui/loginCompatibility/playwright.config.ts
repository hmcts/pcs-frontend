import { defineConfig, devices } from '@playwright/test';

// Self-contained browser checks: no PCS deployment, IDAM account or API setup is needed.
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  timeout: 15000,
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    actionTimeout: 5000,
  },
});
