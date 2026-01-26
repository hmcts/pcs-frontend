import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import config from 'config';

const baseUrl = config.get('e2e.testUrl') as string;

test.describe('NestJS Journey Accessibility @accessibility', () => {
  test('step1 page passes axe accessibility checks', async ({ page }) => {
    await page.goto(`${baseUrl}/nest-journey/step1`);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('step1 with validation errors passes axe checks', async ({ page }) => {
    await page.goto(`${baseUrl}/nest-journey/step1`);
    
    // Submit form without selecting an option to trigger validation
    await page.click('button[type="submit"]');
    
    // Wait for error summary to appear
    await page.waitForSelector('.govuk-error-summary', { timeout: 5000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('step2 page passes axe accessibility checks', async ({ page }) => {
    await page.goto(`${baseUrl}/nest-journey/step1`);
    
    // Fill step1 to navigate to step2
    await page.check('input[value="yes"]');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${baseUrl}/nest-journey/step2`);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('step3 page passes axe accessibility checks', async ({ page }) => {
    await page.goto(`${baseUrl}/nest-journey/step1`);
    
    // Navigate through journey to step3
    await page.check('input[value="yes"]');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${baseUrl}/nest-journey/step2`);
    await page.fill('input[name="name"]', 'Test User');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${baseUrl}/nest-journey/step3`);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('confirmation page passes axe accessibility checks', async ({ page }) => {
    await page.goto(`${baseUrl}/nest-journey/step1`);
    
    // Complete full journey
    await page.check('input[value="yes"]');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${baseUrl}/nest-journey/step2`);
    await page.fill('input[name="name"]', 'Test User');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${baseUrl}/nest-journey/step3`);
    await page.check('input[value="confirm"]');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${baseUrl}/nest-journey/confirmation`);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('error summary receives focus on validation error', async ({ page }) => {
    await page.goto(`${baseUrl}/nest-journey/step1`);
    
    // Submit form without selection
    await page.click('button[type="submit"]');
    
    // Wait for error summary
    await page.waitForSelector('.govuk-error-summary', { timeout: 5000 });
    
    // Check that error summary has focus
    const focusedElement = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return {
        tagName: activeElement?.tagName,
        className: activeElement?.className,
      };
    });
    
    expect(focusedElement.className).toContain('govuk-error-summary');
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await page.goto(`${baseUrl}/nest-journey/step1`);
    
    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // First radio button
    
    // Check focus is on radio button
    const focusedElement = await page.evaluate(() => {
      const activeElement = document.activeElement as HTMLElement;
      return {
        tagName: activeElement?.tagName,
        type: activeElement?.getAttribute('type'),
      };
    });
    
    expect(focusedElement.tagName).toBe('INPUT');
    expect(focusedElement.type).toBe('radio');
  });
});

test.describe('Postcode Lookup Accessibility @accessibility', () => {
  test('postcode lookup page passes axe checks', async ({ page }) => {
    await page.goto(`${baseUrl}/`);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Dashboard Accessibility @accessibility', () => {
  test('dashboard page passes axe checks', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
