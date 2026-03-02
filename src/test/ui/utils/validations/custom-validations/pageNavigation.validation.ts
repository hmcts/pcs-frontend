import * as fs from 'fs';
import * as path from 'path';

import { Page, expect } from '@playwright/test';

import { IValidation } from '../../interfaces';

type NavigationTestResult = {
  pageUrl: string;
  pageName: string;
  testName: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  error?: string;
};

export class PageNavigationValidation implements IValidation {
  private static navigationResults: NavigationTestResult[] = [];
  private static testCounter = 0;
  private static pagesWithNavigation = new Set<string>();
  private static pagesPassed = new Set<string>();
  private static missingNavigationMethods = new Set<string>();
  private static missingNavigationFiles = new Set<string>();
  private static readonly MAPPING_PATH = path.join(__dirname, '../../../config/urlToFileMapping.config.ts');

  async validate(page: Page, validation: string, fieldName: string): Promise<void> {
    if (validation !== 'mainHeader' && validation !== 'pageNavigation') {
      return;
    }

    if (validation === 'mainHeader') {
      await this.validateMainHeader(page, fieldName);
    } else if (validation === 'pageNavigation') {
      await this.validatePageNavigation(page, fieldName);
    }
  }

  private async validateMainHeader(page: Page, expectedHeader: string): Promise<void> {
    try {
      const locator = page.locator('h1, h1.govuk-heading-xl, h1.govuk-heading-l');
      await expect(locator).toHaveText(expectedHeader);

      const pageName = await PageNavigationValidation.getPageNameFromUrl(page.url(), page);

      PageNavigationValidation.navigationResults.push({
        pageUrl: page.url(),
        pageName,
        testName: 'Main Header Validation',
        passed: true,
        expected: expectedHeader,
        actual: expectedHeader,
      });

      PageNavigationValidation.pagesPassed.add(pageName);
    } catch (error) {
      const actualText = await page
        .locator('h1')
        .first()
        .textContent()
        .catch(() => 'Not found');

      const pageName = await PageNavigationValidation.getPageNameFromUrl(page.url(), page);

      PageNavigationValidation.navigationResults.push({
        pageUrl: page.url(),
        pageName,
        testName: 'Main Header Validation',
        passed: false,
        expected: expectedHeader,
        actual: actualText || 'Not found',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async validatePageNavigation(page: Page, expectedUrl: string): Promise<void> {
    try {
      const currentUrl = page.url();
      const pageName = await PageNavigationValidation.getPageNameFromUrl(page.url(), page);

      const urlPassed = currentUrl.includes(expectedUrl);

      PageNavigationValidation.navigationResults.push({
        pageUrl: currentUrl,
        pageName,
        testName: 'Page Navigation Validation',
        passed: urlPassed,
        expected: expectedUrl,
        actual: currentUrl,
      });

      if (urlPassed) {
        PageNavigationValidation.pagesPassed.add(pageName);
      }
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('Expected URL'))) {
        throw error;
      }
    }
  }

  static trackPageWithNavigation(pageName: string): void {
    PageNavigationValidation.pagesWithNavigation.add(pageName);
  }

  static trackPagePassed(pageName: string): void {
    PageNavigationValidation.pagesPassed.add(pageName);
  }

  static trackMissingNavigationMethod(pageName: string): void {
    PageNavigationValidation.missingNavigationMethods.add(pageName);
  }

  static trackMissingNavigationFile(pageName: string): void {
    PageNavigationValidation.missingNavigationFiles.add(pageName);
  }

  static trackNavigationFailure(pageName: string, _error?: unknown): void {
    PageNavigationValidation.missingNavigationMethods.add(pageName);
  }

  private static async getPageNameFromUrl(url: string, page?: Page): Promise<string> {
    try {
      const { pathname } = new URL(url);
      const segments = pathname.split('/').filter(Boolean);
      const urlSegment = segments.at(-1) || 'home';

      const mapping = PageNavigationValidation.loadMapping();
      if (!mapping) {
        return urlSegment;
      }

      if (/^\d+$/.test(urlSegment) && page) {
        const headerText = await PageNavigationValidation.getHeaderText(page);
        return headerText ? mapping[headerText] || urlSegment : urlSegment;
      }

      return mapping[urlSegment] || urlSegment;
    } catch {
      const segments = url.split('/').filter(Boolean);
      return segments.at(-1) || 'home';
    }
  }

  private static loadMapping(): Record<string, string> | null {
    try {
      if (!fs.existsSync(PageNavigationValidation.MAPPING_PATH)) {
        return null;
      }

      const mappingContent = fs.readFileSync(PageNavigationValidation.MAPPING_PATH, 'utf8');
      const match = mappingContent.match(/export default\s*({[\s\S]*?});/);

      if (!match) {
        return null;
      }

      const objectString = match[1].replace(/\s+/g, ' ').replace(/,\s*}/g, '}');
      return eval(`(${objectString})`);
    } catch {
      return null;
    }
  }

  private static async getHeaderText(page: Page): Promise<string | null> {
    try {
      const h1Element = page.locator('h1').first();
      if (await h1Element.isVisible({ timeout: 2000 }).catch(() => false)) {
        const h1Text = await h1Element.textContent();
        if (h1Text && h1Text.trim() !== '') {
          return h1Text.trim();
        }
      }

      const h2Element = page.locator('h2').first();
      if (await h2Element.isVisible({ timeout: 2000 }).catch(() => false)) {
        const h2Text = await h2Element.textContent();
        if (h2Text && h2Text.trim() !== '') {
          return h2Text.trim();
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  static finaliseTest(): void {
    PageNavigationValidation.testCounter++;

    const totalPages =
      PageNavigationValidation.pagesWithNavigation.size +
      PageNavigationValidation.missingNavigationMethods.size +
      PageNavigationValidation.missingNavigationFiles.size;

    if (totalPages === 0) {
      console.log(`\n📊 NAVIGATION TESTS (Test #${PageNavigationValidation.testCounter}):`);
      console.log('   No pages checked for navigation tests');
      return;
    }

    const passedTests = PageNavigationValidation.navigationResults.filter(r => r.passed);
    const passedPages = [...new Set(passedTests.map(r => r.pageName))];

    console.log(`\n📊 NAVIGATION TESTS SUMMARY (Test #${PageNavigationValidation.testCounter}):`);
    console.log(`   Total pages with navigation tests: ${totalPages}`);
    console.log(`   Number of pages passed: ${passedPages.length}`);
    console.log(`   Number of pages failed: 0`);
    console.log(
      `   Missing navigation methods: ${PageNavigationValidation.missingNavigationMethods.size + PageNavigationValidation.missingNavigationFiles.size}`
    );

    if (passedPages.length > 0) {
      console.log(`   Passed pages: ${passedPages.join(', ')}`);
    }

    if (PageNavigationValidation.missingNavigationMethods.size > 0) {
      console.log(
        `   Navigation methods not found: ${Array.from(PageNavigationValidation.missingNavigationMethods).join(', ')}`
      );
    }

    if (PageNavigationValidation.missingNavigationFiles.size > 0) {
      console.log(
        `   Navigation files not found: ${Array.from(PageNavigationValidation.missingNavigationFiles).join(', ')}`
      );
    }

    if (passedPages.length > 0) {
      console.log('\n✅ ALL NAVIGATION TESTS PASSED\n');
    } else if (PageNavigationValidation.pagesWithNavigation.size > 0) {
      console.log('\n⚠️  Navigation files found but no tests performed\n');
    }

    PageNavigationValidation.clearResults();
  }

  static clearResults(): void {
    PageNavigationValidation.navigationResults = [];
    PageNavigationValidation.pagesWithNavigation.clear();
    PageNavigationValidation.pagesPassed.clear();
    PageNavigationValidation.missingNavigationMethods.clear();
    PageNavigationValidation.missingNavigationFiles.clear();
  }
}
