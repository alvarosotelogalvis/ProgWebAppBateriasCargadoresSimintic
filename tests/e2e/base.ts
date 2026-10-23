import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, usar) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', {
        configurable: true,
        get: () => true,
      });
    });
    await usar(page);
  },
});

export { expect } from '@playwright/test';
