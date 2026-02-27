import * as fs from 'fs';
import * as path from 'path';

import { Page } from '@playwright/test';

import {
  enable_content_validation,
  enable_error_message_validation,
  enable_navigation_tests,
} from '../../../../../../playwright.config';
import { IAction } from '../../interfaces';
import {
  ErrorMessageValidation,
  PageContentValidation,
  PageNavigationValidation,
} from '../../validations/custom-validations';

export class TriggerPageFunctionalTestsAction implements IAction {
  private static readonly LOCK_DIR = path.join(process.cwd(), 'test-results', 'pft-locks');
  private static readonly MAPPING_PATH = path.join(__dirname, '../../../config/urlToFileMapping.config.ts');
  private static readonly PFT_DIR = path.join(__dirname, '../../../functional');
  private static readonly PAGE_DATA_DIR = path.join(__dirname, '../../../data/page-data');

  // Track missing PFT files across the entire test run
  private static missingPFTPages: Set<string> = new Set();
  private static testCounter = 0;

  async execute(page: Page): Promise<void> {
    await this.triggerPageFunctionalTests(page);
  }

  /**
   * Main method to trigger all page functional tests based on configuration
   */
  private async triggerPageFunctionalTests(page: Page): Promise<void> {
    // Get page name using URL mapping
    const pageName = await this.getFileNameForPage(page);
    const pageUrl = page.url();

    if (!pageName) {
      // Let EMV handle missing page tracking when validation is attempted
      return;
    }

    // Acquire lock for this page to prevent repeated execution
    if (!this.acquirePageLock(pageName)) {
      return; // Silent skip
    }

    const pftFilePath = path.join(TriggerPageFunctionalTestsAction.PFT_DIR, `${pageName}.pft.ts`);
    const pftFileExists = fs.existsSync(pftFilePath);

    if (!pftFileExists) {
      // Track missing PFT file for consolidated logging at the end
      TriggerPageFunctionalTestsAction.missingPFTPages.add(pageName);

      // Still track for EMV summary - pass pageName to avoid URL parsing
      if (enable_error_message_validation) {
        ErrorMessageValidation.trackMissingEMVFile(pageUrl, pageName);
      }
      return;
    }

    // Execute enabled functional tests
    if (enable_content_validation) {
      await this.runPageContentValidation(page, pageName);
    }

    if (enable_error_message_validation) {
      await this.runErrorMessageValidation(page, pageName, pftFilePath);
    }

    if (enable_navigation_tests) {
      await this.runNavigationTests(page, pageName, pftFilePath);
    }
  }

  /**
   * Run page content validation if enabled
   */
  private async runPageContentValidation(page: Page, pageName: string): Promise<void> {
    const pageDataFilePath = path.join(TriggerPageFunctionalTestsAction.PAGE_DATA_DIR, `${pageName}.page.data.ts`);
    const pageDataFileExists = fs.existsSync(pageDataFilePath);

    if (!pageDataFileExists) {
      PageContentValidation.trackMissingDataFile(pageName);
      return;
    }

    try {
      const validation = new PageContentValidation();
      await validation.validateCurrentPage(page);
    } catch (error) {
      console.log(error); // Error tracking is handled by PageContentValidation.finaliseTest()
    }
  }

  /**
   * Run error message validation if enabled
   */
  private async runErrorMessageValidation(page: Page, pageName: string, pftFilePath: string): Promise<void> {
    try {
      delete require.cache[require.resolve(pftFilePath)];
      const pftModule = require(pftFilePath);

      const methodName = `${pageName}ErrorValidation`;
      const validationFunction = pftModule[methodName];

      if (typeof validationFunction === 'function') {
        await validationFunction(page);
      } else {
        // Method doesn't exist - EMV will handle tracking - pass pageName
        ErrorMessageValidation.trackMissingEMVFile(page.url(), pageName);
      }
    } catch (error) {
      // Error will be caught and tracked by EMV through normal validation flow
      console.error(`   Error in EMV execution for ${pageName}:`, error);
    }
  }

  /**
   * Run navigation tests if enabled
   */
  private async runNavigationTests(page: Page, pageName: string, pftFilePath: string): Promise<void> {
    try {
      delete require.cache[require.resolve(pftFilePath)];
      const pftModule = require(pftFilePath);

      const methodName = `${pageName}NavigationTests`;
      const navigationFunction = pftModule[methodName];

      if (typeof navigationFunction === 'function') {
        PageNavigationValidation.trackNavigationTest(page.url(), pageName);
        await navigationFunction(page);
      } else {
        PageNavigationValidation.trackMissingNavigationMethod(page.url(), pageName);
      }
    } catch (error) {
      PageNavigationValidation.trackNavigationFailure(page.url(), pageName, error);
    }
  }

  /**
   * Get file name for page using URL mapping logic
   */
  private async getFileNameForPage(page: Page): Promise<string | null> {
    const urlSegment = this.getUrlSegment(page.url());

    const mapping = this.loadMapping();
    if (!mapping) {
      return null;
    }

    if (/^\d+$/.test(urlSegment)) {
      const headerText = await this.getHeaderText(page);
      return headerText ? (mapping[headerText] ?? null) : null;
    }

    return mapping[urlSegment] ?? null;
  }

  /**
   * Load URL to file mapping
   */
  private loadMapping(): Record<string, string> | null {
    try {
      if (!fs.existsSync(TriggerPageFunctionalTestsAction.MAPPING_PATH)) {
        return null;
      }

      const mappingContent = fs.readFileSync(TriggerPageFunctionalTestsAction.MAPPING_PATH, 'utf8');
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

  /**
   * Extract URL segment from page URL
   */
  private getUrlSegment(url: string): string {
    try {
      const { pathname } = new URL(url);
      const segments = pathname.split('/').filter(Boolean);
      return segments.at(-1) || 'home';
    } catch {
      const segments = url.split('/').filter(Boolean);
      return segments.at(-1) || 'home';
    }
  }

  /**
   * Get header text from page for dynamic page identification
   */
  private async getHeaderText(page: Page): Promise<string | null> {
    for (const selector of ['h1', 'h2']) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = (await el.textContent())?.trim();
        if (text) {
          return text;
        }
      }
    }
    return null;
  }

  /**
   * Acquire lock for page to prevent repeated execution
   */
  private acquirePageLock(pageName: string): boolean {
    try {
      if (!fs.existsSync(TriggerPageFunctionalTestsAction.LOCK_DIR)) {
        fs.mkdirSync(TriggerPageFunctionalTestsAction.LOCK_DIR, { recursive: true });
      }

      const lockPath = path.join(TriggerPageFunctionalTestsAction.LOCK_DIR, `${pageName}.lock`);

      // Try to create lock file exclusively
      fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'wx' });
      return true;
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        return false; // Silent skip
      }
      console.error(`Error acquiring lock for page ${pageName}:`, error);
      return false;
    }
  }

  /**
   * Finalise test - called at the end of each test case
   */
  static finaliseTest(): void {
    this.testCounter++;

    // Log missing PFT files if any
    if (this.missingPFTPages.size > 0) {
      console.log(`\n📊 PAGE FUNCTIONAL TESTS - PFT Files Status (Test #${this.testCounter}):`);
      console.log(`   PFT files not found for pages: ${Array.from(this.missingPFTPages).join(', ')}`);
    }

    // Clear for next test
    this.missingPFTPages.clear();
  }
}
