import { defineConfig, devices } from '@playwright/test';

const VIEWPORTS = {
  compacto: { width: 360, height: 740 },
  medio: { width: 768, height: 1024 },
  expandido: { width: 1280, height: 800 },
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'], viewport: VIEWPORTS.compacto },
    },
    {
      name: 'chromium-tablet',
      use: { ...devices['Desktop Chrome'], viewport: VIEWPORTS.medio },
    },
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: VIEWPORTS.expandido },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 14'], viewport: VIEWPORTS.compacto },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
