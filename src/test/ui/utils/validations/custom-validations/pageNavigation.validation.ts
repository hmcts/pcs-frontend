import * as fs from 'fs';
import * as path from 'path';

import { Page, expect } from '@playwright/test';

import { type PftNavigationLogContext, logPftValidationInformation } from '../../common/pft-debug-log';
import { performAction } from '../../controller';
import { IValidation, validationRecord } from '../../interfaces';

type NavigationTestResult = {
  pageUrl: string;
  pageName: string;
  testName: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  error?: string;
  hasPFTFile: boolean;
  sourcePage?: string;
  validationType?: 'element' | 'url';
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
  private static currentSourcePage: string | null = null;
  private static navigationFailed = false;

  static setSourcePage(pageName: string): void {
    PageNavigationValidation.currentSourcePage = pageName;
  }

  static clearSourcePage(): void {
    PageNavigationValidation.currentSourcePage = null;
  }

  /** Matches `validate`: feedback / Back links use clickLink; everything else uses clickButton. */
  private static usesClickLink(navigateButton: string | undefined): boolean {
    return Boolean(
      navigateButton && (navigateButton.includes('Back') || navigateButton.includes('feedback'))
    );
  }

  private static buildNavigationLogContext(
    navigateButton: string | undefined,
    destinationPageName: string
  ): PftNavigationLogContext {
    return {
      sourcePage: PageNavigationValidation.currentSourcePage ?? '?',
      sourceUrl: PageNavigationValidation.currentPageUrl || '',
      actionKind: PageNavigationValidation.usesClickLink(navigateButton) ? 'clickLink' : 'clickButton',
      actionName: navigateButton?.trim() || '?',
      destinationPageName,
    };
  }

  async validate(page: Page, _validation: string, navigateButton: string, fieldName: validationRecord): Promise<void> {
    PageNavigationValidation.currentPageUrl = page.url();
    let newPage: Page | null = null;

    if (navigateButton) {
      const popupPromise = page.context().waitForEvent('page').catch(() => null);
      if (PageNavigationValidation.usesClickLink(navigateButton)) {
        await performAction('clickLink', navigateButton);
        await page.waitForTimeout(200);
      } else {
        await performAction('clickButton', navigateButton);
      }
      newPage = await PageNavigationValidation.attachLoadedPopup(popupPromise);
    }

    const isNewWindow = Boolean(newPage);
    const pageToValidate = newPage ?? page;

    try {
      await this.validatePageNavigation(pageToValidate, fieldName, navigateButton);
    } finally {
      if (newPage && !newPage.isClosed()) {
        await newPage.close();
      }
      if (
        PageNavigationValidation.currentPageUrl &&
        !isNewWindow &&
        page.url() !== PageNavigationValidation.currentPageUrl
      ) {
        await performAction('navigateToUrl', PageNavigationValidation.currentPageUrl);
      }
    }
  }

  /** Resolves a new browser window from click, or null if none opens / load fails. */
  private static async attachLoadedPopup(popupPromise: Promise<Page | null>): Promise<Page | null> {
    const popup = await Promise.race([
      popupPromise,
      new Promise<Page | null>(resolve => setTimeout(() => resolve(null), 1000)),
    ]);
    if (!popup) {
      return null;
    }
    try {
      if (popup.isClosed() || popup.url() === 'about:blank') {
        return null;
      }
      await popup.waitForLoadState();
      return popup;
    } catch {
      console.log('Popup closed while checking url or new window closed before load');
      return null;
    }
  }

  private async validatePageNavigation(
    page: Page,
    fieldName: validationRecord,
    navigateButton?: string
  ): Promise<void> {
    try {
      const {
        elementPassed,
        urlPassed,
        elementError,
        urlError,
        actualElementText,
        expectedElementText,
        actualUrl,
        expectedUrlPattern,
      } = await PageNavigationValidation.runNavigationChecks(page, fieldName);

      const pageName = await PageNavigationValidation.getPageNameFromUrl(page.url(), page);
      const hasPFTFile = PageNavigationValidation.hasPFTFile(pageName);
      const overallPassed = elementPassed && urlPassed;
      const sourcePage = PageNavigationValidation.currentSourcePage || undefined;

      if (!elementPassed) {
        PageNavigationValidation.recordResult({
          pageUrl: page.url(),
          pageName,
          sourcePage,
          testName: 'Page Navigation Element Validation',
          passed: false,
          expected: expectedElementText,
          actual: actualElementText,
          error: elementError,
          hasPFTFile,
          validationType: 'element',
        });
      }

      if (!urlPassed && fieldName && typeof fieldName === 'object' && (fieldName as { pageSlug?: string }).pageSlug) {
        PageNavigationValidation.recordResult({
          pageUrl: page.url(),
          pageName,
          sourcePage,
          testName: 'Page Navigation URL Validation',
          passed: false,
          expected: expectedUrlPattern,
          actual: actualUrl,
          error: urlError || 'Page slug validation failed',
          hasPFTFile,
          validationType: 'url',
        });
      }

      if (overallPassed) {
        PageNavigationValidation.recordResult({
          pageUrl: page.url(),
          pageName,
          sourcePage,
          testName: 'Page Navigation Validation',
          passed: true,
          expected: expectedElementText || 'URL validation passed',
          actual: actualElementText || page.url(),
          hasPFTFile,
        });
        if (hasPFTFile) {
          PageNavigationValidation.pagesPassed.add(pageName);
        }
      }

      const expectedDestination =
        [
          expectedElementText && `expected heading: "${expectedElementText}"`,
          expectedUrlPattern && `expected URL: ${expectedUrlPattern}`,
        ]
          .filter(Boolean)
          .join(' | ') || '—';
      const actualDestination = [
        actualElementText && `landing heading: "${actualElementText}"`,
        `landing URL: ${actualUrl || page.url()}`,
      ]
        .filter(Boolean)
        .join(' | ');

      await logPftValidationInformation(
        page,
        'page-navigation',
        pageName,
        expectedDestination,
        actualDestination,
        !overallPassed,
        PageNavigationValidation.buildNavigationLogContext(navigateButton, pageName)
      );
    } catch (error) {
      const pageName = await PageNavigationValidation.getPageNameFromUrl(page.url(), page);
      const actualText = await page
        .locator('h1')
        .first()
        .textContent()
        .catch(() => 'Not found');
      const hasPFTFile = PageNavigationValidation.hasPFTFile(pageName);
      const expectedValue = PageNavigationValidation.formatExpectedFieldName(fieldName);
      const errMsg = PageNavigationValidation.errorFirstLine(error);

      PageNavigationValidation.recordResult({
        pageUrl: page.url(),
        pageName,
        sourcePage: PageNavigationValidation.currentSourcePage || undefined,
        testName: 'Page Navigation Validation',
        passed: false,
        expected: expectedValue,
        actual: actualText || 'Not found',
        error: errMsg,
        hasPFTFile,
      });

      await logPftValidationInformation(
        page,
        'page-navigation',
        pageName,
        `expected: ${expectedValue}`,
        `actual heading: ${actualText || 'Not found'} | landing URL: ${page.url()}`,
        true,
        PageNavigationValidation.buildNavigationLogContext(navigateButton, pageName)
      );
    }
  }

  private static async runNavigationChecks(
    page: Page,
    fieldName: validationRecord
  ): Promise<{
    elementPassed: boolean;
    urlPassed: boolean;
    elementError?: string;
    urlError?: string;
    actualElementText: string;
    expectedElementText: string;
    actualUrl: string;
    expectedUrlPattern: string;
  }> {
    let elementPassed = true;
    let urlPassed = true;
    let elementError: string | undefined;
    let urlError: string | undefined;
    let actualElementText = '';
    let expectedElementText = '';
    let actualUrl = '';
    let expectedUrlPattern = '';

    if (fieldName && typeof fieldName === 'object') {
      const data = fieldName as { element?: string; pageSlug?: string };

      if (data.element) {
        expectedElementText = data.element;
        const heading = await PageNavigationValidation.expectHeadingMatch(page, data.element, {
          includeSpanTextIs: true,
        });
        elementPassed = heading.ok;
        actualElementText = heading.actual;
        elementError = heading.error;
      }

      if (data.pageSlug) {
        const urlCheck = PageNavigationValidation.checkSmartsurveyUrl(page, data.pageSlug);
        expectedUrlPattern = urlCheck.expectedUrlPattern;
        actualUrl = urlCheck.actualUrl;
        urlPassed = urlCheck.ok;
        urlError = urlCheck.error;
      }
    } else {
      expectedElementText = String(fieldName);
      const heading = await PageNavigationValidation.expectHeadingMatch(page, expectedElementText, {
        includeSpanTextIs: false,
      });
      elementPassed = heading.ok;
      actualElementText = heading.actual;
      elementError = heading.error;
      if (!elementPassed) {
        throw new Error(elementError || 'Heading validation failed');
      }
    }

    return {
      elementPassed,
      urlPassed,
      elementError,
      urlError,
      actualElementText,
      expectedElementText,
      actualUrl,
      expectedUrlPattern,
    };
  }

  private static async expectHeadingMatch(
    page: Page,
    expectedElementText: string,
    options: { includeSpanTextIs: boolean }
  ): Promise<{ ok: boolean; actual: string; error?: string }> {
    const selector = options.includeSpanTextIs
      ? `h1, h1.govuk-heading-xl, h1.govuk-heading-l, span:text-is("${expectedElementText}")`
      : 'h1, h1.govuk-heading-xl, h1.govuk-heading-l';
    const locator = page.locator(selector);
    try {
      await expect(locator).toHaveText(expectedElementText, { timeout: 5000 });
      return { ok: true, actual: expectedElementText };
    } catch (error) {
      const actual =
        (await locator
          .first()
          .textContent()
          .catch(() => 'Not found')) || 'Not found';
      return { ok: false, actual, error: PageNavigationValidation.errorFirstLine(error) };
    }
  }

  private static checkSmartsurveyUrl(
    page: Page,
    pageSlug: string
  ): { ok: boolean; expectedUrlPattern: string; actualUrl: string; error?: string } {
    const expectedUrlPattern = `https://www.smartsurvey.co.uk/s/Poss_feedback/?pageurl=respond-to-claim/${pageSlug}`;
    const actualUrl = page.url();
    if (actualUrl !== expectedUrlPattern) {
      return {
        ok: false,
        expectedUrlPattern,
        actualUrl,
        error: `URL mismatch. Expected: ${expectedUrlPattern}, Actual: ${actualUrl}`,
      };
    }
    return { ok: true, expectedUrlPattern, actualUrl };
  }

  private static formatExpectedFieldName(fieldName: validationRecord): string {
    if (typeof fieldName === 'object' && fieldName !== null) {
      const obj = fieldName as { element?: string; pageSlug?: string };
      const parts: string[] = [];
      if (obj.element) {
        parts.push(`element: "${obj.element}"`);
      }
      if (obj.pageSlug) {
        parts.push(`pageSlug: "${obj.pageSlug}"`);
      }
      return `{ ${parts.join(', ')} }`;
    }
    return String(fieldName);
  }

  private static errorFirstLine(error: unknown): string {
    return error instanceof Error ? error.message.split('\n')[0] : String(error);
  }

  private static recordResult(result: NavigationTestResult): void {
    PageNavigationValidation.navigationResults.push(result);
    if (!result.passed) {
      PageNavigationValidation.navigationFailed = true;
    }
  }

  private static normalizePlaywrightExpectError(actual: string, expected: string): string {
    return actual.includes('expect(locator).toHaveText(expected) failed') ? `"${expected}" element not found` : actual;
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    PageNavigationValidation.recordResult({
      pageUrl: '',
      pageName,
      sourcePage: PageNavigationValidation.currentSourcePage || undefined,
      testName: 'Navigation Tests Execution',
      passed: false,
      expected: 'Navigation tests should execute successfully',
      actual: errorMessage,
      error: errorMessage,
      hasPFTFile: true,
    });
  }

  private static hasPFTFile(pageName: string): boolean {
    if (!pageName || pageName === 'home' || pageName === 'Dashboard') {
      return false;
    }
    return fs.existsSync(path.join(PageNavigationValidation.PFT_DIR, `${pageName}.pft.ts`));
  }

  private static async getPageNameFromUrl(url: string, page?: Page): Promise<string> {
    try {
      const { pathname } = new URL(url);
      const segments = pathname.split('/').filter(Boolean);
      const urlSegment = segments.at(-1) || 'home';

      if (urlSegment.toLowerCase() === 'dashboard') {
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
      for (const tag of ['h1', 'h2'] as const) {
        const el = page.locator(tag).first();
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          const text = (await el.textContent())?.trim();
          if (text) {
            return text;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  static finaliseTest(): void {
    PageNavigationValidation.testCounter++;

    const pagesWithNavigationTests = new Set<string>([
      ...PageNavigationValidation.pagesWithNavigation,
      ...PageNavigationValidation.missingNavigationMethods,
      ...PageNavigationValidation.missingNavigationFiles,
    ]);

    const totalPages = pagesWithNavigationTests.size;

    if (totalPages === 0) {
      console.log(`\n📊 NAVIGATION TESTS SUMMARY (Test #${PageNavigationValidation.testCounter}):`);
      console.log('   No pages checked for navigation tests');
      return;
    }

    const failureDetails = new Map<string, { expected: string; actual: string; validationType?: string }>();
    const failedPages = new Set<string>();
    const actuallyPassedPages = new Set<string>();

    for (const result of PageNavigationValidation.navigationResults) {
      if (!result.passed) {
        if (result.sourcePage) {
          failedPages.add(result.sourcePage);
          if (result.expected && result.actual) {
            failureDetails.set(result.sourcePage, {
              expected: result.expected,
              actual: result.actual,
              validationType: result.validationType,
            });
          }
        } else if (result.hasPFTFile) {
          failedPages.add(result.pageName);
          if (result.expected && result.actual) {
            failureDetails.set(result.pageName, {
              expected: result.expected,
              actual: result.actual,
              validationType: result.validationType,
            });
          }
        }
      }
    }

    for (const pageName of PageNavigationValidation.pagesPassed) {
      if (!failedPages.has(pageName)) {
        actuallyPassedPages.add(pageName);
      }
    }

    for (const result of PageNavigationValidation.navigationResults) {
      if (
        result.passed &&
        result.hasPFTFile &&
        !failedPages.has(result.pageName) &&
        !failedPages.has(result.sourcePage || '')
      ) {
        actuallyPassedPages.add(result.pageName);
      }
    }

    const passedPages = new Set<string>();
    for (const pageName of pagesWithNavigationTests) {
      if (!failedPages.has(pageName) && actuallyPassedPages.has(pageName)) {
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

    if (failedPages.size > 0) {
      console.log('\n❌ FAILED NAVIGATION TESTS:');

      for (const pageName of Array.from(failedPages).sort()) {
        const details = failureDetails.get(pageName);
        console.log(`   Page: ${pageName}`);
        if (details) {
          console.log(
            `       Error: ${PageNavigationValidation.normalizePlaywrightExpectError(details.actual, details.expected)}`
          );
        }
        console.log('');
      }
    }

    const hasFailures = failedPages.size > 0 || PageNavigationValidation.navigationFailed;

    if (hasFailures) {
      console.log('❌ NAVIGATION TESTS FAILED\n');
    } else if (passedPages.size > 0) {
      console.log('\n✅ ALL NAVIGATION TESTS PASSED\n');
    } else if (pagesWithNavigationTests.size > 0) {
      console.log('\n⚠️  Navigation files found but no tests performed\n');
    }

    const shouldThrow = hasFailures && PageNavigationValidation.shouldThrowError;
    const errors = Array.from(failureDetails.entries()).map(
      ([page, details]) =>
        `${page}: ${PageNavigationValidation.normalizePlaywrightExpectError(details.actual, details.expected)}`
    );

    PageNavigationValidation.clearResults();

    if (shouldThrow && errors.length > 0) {
      throw new Error(`Navigation tests failed:\n\n${errors.join('\n\n')}`);
    }
  }

  static clearResults(): void {
    PageNavigationValidation.navigationResults = [];
    PageNavigationValidation.pagesWithNavigation.clear();
    PageNavigationValidation.pagesPassed.clear();
    PageNavigationValidation.missingNavigationMethods.clear();
    PageNavigationValidation.missingNavigationFiles.clear();
    PageNavigationValidation.currentPageUrl = '';
    PageNavigationValidation.currentSourcePage = null;
    PageNavigationValidation.navigationFailed = false;
  }
}
