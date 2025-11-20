import { test } from '@playwright/test';

// create a dummy test
test('Dummy test', async ({ page }) => {
  await page.goto('/');
  expect(true).toBeTruthy();
});