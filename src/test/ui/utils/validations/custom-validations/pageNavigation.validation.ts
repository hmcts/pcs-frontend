import * as fs from 'fs';
import * as path from 'path';

import { Page, expect } from '@playwright/test';

import { escapeForRegex } from '../../common/string.utils';
import { performAction } from '../../controller';
import { IValidation } from '../../interfaces';

type NavigationTestResult = {
  pageUrl: string;
  pageName: string;
  testName: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  error?: string;
  hasPFTFile: boolean;
};

export class PageNavigationValidation implements IValidation {
  private static navigationResults: NavigationTestResult[] = [];
  private static testCounter = 0;
  private static pagesWithNavigation = new Set<string>();
  private static pagesPassed = new Set<string>();
  private static missingNavigationMethods = new Set<string>();
  private static missingNavigationFiles = new Set<string>();
  private static shouldThrowError = true;
  private static readonly MAPPING_PATH = path.join(__dirname, '../../../config/urlToFileMapping.config.ts');
  private static readonly PFT_DIR = path.join(__dirname, '../../../functional');
  private static currentPageUrl: string = '';

  async validate(page: Page, validation: string, navigateButton: string, fieldName: string): Promise<void> {
    PageNavigationValidation.currentPageUrl = page.url();
    if (navigateButton) {
      if (navigateButton === 'Back') {
        await performAction('clickLink', navigateButton);
      } else {
        await performAction('clickButton', navigateButton);
      }
    }
    if (validation !== 'mainHeader' && validation !== 'pageNavigation') {
      if (PageNavigationValidation.currentPageUrl) {
        await performAction('navigateToUrl', PageNavigationValidation.currentPageUrl);
      }
      return;
    }

    try {
      if (validation === 'mainHeader') {
        await this.validateMainHeader(page, fieldName);
      } else if (validation === 'pageNavigation') {
        await this.validatePageNavigation(page, fieldName);
      }
    } finally {
      if (PageNavigationValidation.currentPageUrl) {
        await performAction('navigateToUrl', PageNavigationValidation.currentPageUrl);
      }
    }
  }

  private async validateMainHeader(page: Page, expectedHeader: string): Promise<void> {
    try {
      const locator = page.locator('h1, h1.govuk-heading-xl, h1.govuk-heading-l');
      await expect(locator).toHaveText(new RegExp(`^\\s*${escapeForRegex(expectedHeader)}\\s*$`));

      const pageName = await PageNavigationValidation.getPageNameFromUrl(page.url(), page);
      const hasPFTFile = await PageNavigationValidation.hasPFTFile(pageName);

      PageNavigationValidation.navigationResults.push({
        pageUrl: page.url(),
        pageName,
        testName: 'Main Header Validation',
        passed: true,
        expected: expectedHeader,
        actual: expectedHeader,
        hasPFTFile,
      });

      if (hasPFTFile) {
        PageNavigationValidation.pagesPassed.add(pageName);
      }
    } catch (error) {
      const actualText = await page
        .locator('h1')
        .first()
        .textContent()
        .catch(() => 'Not found');

      const pageName = await PageNavigationValidation.getPageNameFromUrl(page.url(), page);
      const hasPFTFile = await PageNavigationValidation.hasPFTFile(pageName);

      PageNavigationValidation.navigationResults.push({
        pageUrl: page.url(),
        pageName,
        testName: 'Main Header Validation',
        passed: false,
        expected: expectedHeader,
        actual: actualText || 'Not found',
        error: error instanceof Error ? error.message.split('\n')[0] : String(error),
        hasPFTFile,
      });
    }
  }

  private async validatePageNavigation(page: Page, expectedHeader: string): Promise<void> {
    try {
      const locator = page.locator('h1, h1.govuk-heading-xl, h1.govuk-heading-l');
      await expect(locator).toHaveText(new RegExp(`^\\s*${escapeForRegex(expectedHeader)}\\s*$`));

      const pageName = await PageNavigationValidation.getPageNameFromUrl(page.url(), page);
      const actualText = await locator.first().textContent();
      const hasPFTFile = await PageNavigationValidation.hasPFTFile(pageName);

      PageNavigationValidation.navigationResults.push({
        pageUrl: page.url(),
        pageName,
        testName: 'Page Navigation Validation',
        passed: true,
        expected: expectedHeader,
        actual: actualText || '',
        hasPFTFile,
      });

      if (hasPFTFile) {
        PageNavigationValidation.pagesPassed.add(pageName);
      }
    } catch (error) {
      const pageName = await PageNavigationValidation.getPageNameFromUrl(page.url(), page);
      const actualText = await page
        .locator('h1')
        .first()
        .textContent()
        .catch(() => 'Not found');
      const hasPFTFile = await PageNavigationValidation.hasPFTFile(pageName);

      PageNavigationValidation.navigationResults.push({
        pageUrl: page.url(),
        pageName,
        testName: 'Page Navigation Validation',
        passed: false,
        expected: expectedHeader,
        actual: actualText || 'Not found',
        error: error instanceof Error ? error.message.split('\n')[0] : String(error),
        hasPFTFile,
      });
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

  static trackNavigationFailure(pageName: string, error?: unknown): void {
    PageNavigationValidation.navigationResults.push({
      pageUrl: '',
      pageName,
      testName: 'Navigation Tests Execution',
      passed: false,
      expected: 'Navigation tests should execute successfully',
      actual: 'Execution failed',
      error: error instanceof Error ? error.message.split('\n')[0] : String(error),
      hasPFTFile: true,
    });
  }

  private static async hasPFTFile(pageName: string): Promise<boolean> {
    if (!pageName || pageName === 'home' || pageName === 'Dashboard') {
      return false;
    }
    const pftPath = path.join(PageNavigationValidation.PFT_DIR, `${pageName}.pft.ts`);
    return fs.existsSync(pftPath);
  }

  private static async getPageNameFromUrl(url: string, page?: Page): Promise<string> {
    try {
      const { pathname } = new URL(url);
      const segments = pathname.split('/').filter(Boolean);
      const urlSegment = segments.at(-1) || 'home';

      if (urlSegment === 'dashboard') {
        return 'Dashboard';
      }

      const mapping = PageNavigationValidation.loadMapping();
      if (!mapping) {
        return urlSegment;
      }

      if (/^\d+$/.test(urlSegment) && page) {
        const headerText = await PageNavigationValidation.getHeaderText(page);
        if (headerText) {
          for (const value of Object.values(mapping)) {
            if (value === headerText.replace(/\s+/g, '')) {
              return value;
            }
          }
          return headerText.replace(/\s+/g, '');
        }
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

    const pagesWithNavigationMethods = new Set<string>();

    for (const pageName of PageNavigationValidation.pagesWithNavigation) {
      pagesWithNavigationMethods.add(pageName);
    }

    const totalPages =
      pagesWithNavigationMethods.size +
      PageNavigationValidation.missingNavigationMethods.size +
      PageNavigationValidation.missingNavigationFiles.size;

    if (totalPages === 0) {
      console.log(`\n📊 NAVIGATION TESTS (Test #${PageNavigationValidation.testCounter}):`);
      console.log('   No pages checked for navigation tests');
      return;
    }

    // Track failures by the page that has the PFT file
    const failureDetails = new Map<string, { expected: string; actual: string }>();
    const failedPages = new Set<string>();
    const passedPages = new Set<string>();

    // First, identify all pages with PFT files that have any failures
    for (const result of PageNavigationValidation.navigationResults) {
      if (!result.passed) {
        // If this failure is on a page with a PFT file, mark it as failed
        if (result.hasPFTFile) {
          failedPages.add(result.pageName);
          if (result.expected && result.actual) {
            failureDetails.set(result.pageName, {
              expected: result.expected,
              actual: result.actual,
            });
          }
        } else {
          // If the failure is on a page without a PFT file (like Dashboard),
          // we need to find which page with a PFT file led us here
          for (const pageWithPFT of PageNavigationValidation.pagesWithNavigation) {
            failedPages.add(pageWithPFT);
            if (result.expected && result.actual) {
              failureDetails.set(pageWithPFT, {
                expected: result.expected,
                actual: result.actual,
              });
            }
          }
        }
      }
    }

    // A page passes only if it has no failures and has a PFT file
    for (const result of PageNavigationValidation.navigationResults) {
      if (result.passed && result.hasPFTFile && !failedPages.has(result.pageName)) {
        passedPages.add(result.pageName);
      }
    }

    // Add pages that were explicitly marked as passed (and haven't failed)
    for (const pageName of PageNavigationValidation.pagesPassed) {
      if (!failedPages.has(pageName)) {
        passedPages.add(pageName);
      }
    }

    console.log(`\n📊 NAVIGATION TESTS SUMMARY (Test #${PageNavigationValidation.testCounter}):`);
    console.log(`   Total pages with navigation tests: ${totalPages}`);
    console.log(`   Number of pages passed: ${passedPages.size}`);
    console.log(`   Number of pages failed: ${failedPages.size}`);
    console.log(
      `   Missing navigation methods: ${PageNavigationValidation.missingNavigationMethods.size + PageNavigationValidation.missingNavigationFiles.size}`
    );

    if (passedPages.size > 0) {
      console.log(`   Passed pages: ${Array.from(passedPages).join(', ')}`);
    }

    if (failedPages.size > 0) {
      console.log(`   Failed pages: ${Array.from(failedPages).join(', ')}`);
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

    // Show failure details
    if (failedPages.size > 0) {
      console.log('\n❌ FAILED NAVIGATION TESTS:');

      for (const pageName of Array.from(failedPages).sort()) {
        const details = failureDetails.get(pageName);
        console.log(`   Page: ${pageName}`);
        if (details) {
          console.log(`       Expected: ${details.expected}`);
          console.log(`       Actual: ${details.actual}`);
        }
        console.log('');
      }
    }

    // Throw error if there were any failures on pages with PFT files
    if (failedPages.size > 0 && PageNavigationValidation.shouldThrowError) {
      throw new Error(`Navigation tests failed: ${failedPages.size} page(s) have failures`);
    }

    if (failedPages.size > 0) {
      console.log('❌ NAVIGATION TESTS FAILED\n');
    } else if (passedPages.size > 0) {
      console.log('\n✅ ALL NAVIGATION TESTS PASSED\n');
    } else if (pagesWithNavigationMethods.size > 0) {
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
    PageNavigationValidation.currentPageUrl = '';
  }
}
