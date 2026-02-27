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
  private static navigationTracking = new Map<
    string,
    {
      hasTests: boolean;
      methodExists: boolean;
      missingReason?: string;
    }
  >();
  private static shouldThrowError = true;

  async validate(page: Page, validation: string, fieldName: string): Promise<void> {
    if (validation !== 'mainHeader') {
      return;
    }

    try {
      const locator = page.locator('h1, h1.govuk-heading-xl, h1.govuk-heading-l');
      await expect(locator).toHaveText(fieldName);

      // If successful, track as passed
      PageNavigationValidation.navigationResults.push({
        pageUrl: page.url(),
        pageName: 'unknown', // Will be updated by static methods
        testName: 'Main Header Validation',
        passed: true,
        expected: fieldName,
        actual: fieldName,
      });
    } catch (error) {
      // Track failure
      const actualText = await page
        .locator('h1')
        .first()
        .textContent()
        .catch(() => 'Not found');

      PageNavigationValidation.navigationResults.push({
        pageUrl: page.url(),
        pageName: 'unknown', // Will be updated by static methods
        testName: 'Main Header Validation',
        passed: false,
        expected: fieldName,
        actual: actualText || 'Not found',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  static trackNavigationTest(pageUrl: string, pageName: string): void {
    if (!this.navigationTracking.has(pageName)) {
      this.navigationTracking.set(pageName, {
        hasTests: true,
        methodExists: true,
      });
    }
  }

  static trackMissingNavigationMethod(pageUrl: string, pageName: string): void {
    if (!this.navigationTracking.has(pageName)) {
      this.navigationTracking.set(pageName, {
        hasTests: false,
        methodExists: false,
        missingReason: 'Navigation test method not found',
      });
    }
  }

  static trackNavigationFailure(pageUrl: string, pageName: string, error?: unknown): void {
    PageNavigationValidation.navigationResults.push({
      pageUrl,
      pageName,
      testName: 'Navigation Tests Execution',
      passed: false,
      expected: 'Navigation tests should execute successfully',
      actual: 'Execution failed',
      error: error instanceof Error ? error.message : String(error),
    });

    if (!PageNavigationValidation.navigationTracking.has(pageName)) {
      PageNavigationValidation.navigationTracking.set(pageName, {
        hasTests: true,
        methodExists: true,
      });
    }
  }

  static addResult(result: Omit<NavigationTestResult, 'pageName'> & { pageUrl: string; pageName: string }): void {
    this.navigationResults.push({
      ...result,
      pageName: result.pageName,
    });
  }

  static getResults(): NavigationTestResult[] {
    return this.navigationResults;
  }

  static clearResults(): void {
    this.navigationResults = [];
    this.navigationTracking.clear();
  }

  static setThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow;
  }

  static finaliseTest(): void {
    this.testCounter++;

    const results = this.navigationResults;
    const trackingEntries = Array.from(this.navigationTracking.entries());

    if (trackingEntries.length === 0 && results.length === 0) {
      console.log(`\n📊 NAVIGATION TESTS (Test #${this.testCounter}):`);
      console.log('   No navigation tests executed');
      return;
    }

    const allPages = trackingEntries.map(([pageName]) => pageName);
    //const pagesWithTests = trackingEntries.filter(([_, data]) => data.hasTests).map(([pageName]) => pageName);
    const pagesWithoutMethod = trackingEntries
      .filter(([_, data]) => !data.methodExists)
      .map(([pageName, data]) => `${pageName} (${data.missingReason || 'Method not found'})`);

    const passedTests = results.filter(r => r.passed);
    const failedTests = results.filter(r => !r.passed);

    const passedPages = [...new Set(passedTests.map(r => r.pageName))];
    const failedPages = [...new Set(failedTests.map(r => r.pageName))];

    console.log(`\n📊 NAVIGATION TESTS SUMMARY (Test #${this.testCounter}):`);
    console.log(`   Total pages with navigation tests: ${allPages.length}`);
    console.log(`   Number of pages passed: ${passedPages.length}`);
    console.log(`   Number of pages failed: ${failedPages.length}`);

    if (pagesWithoutMethod.length > 0) {
      console.log(`   Missing navigation methods: ${pagesWithoutMethod.length}`);
      console.log(`   Details: ${pagesWithoutMethod.join(', ')}`);
    }

    if (passedPages.length > 0) {
      console.log(`   Passed pages: ${passedPages.join(', ') || 'None'}`);
    }

    if (failedTests.length > 0) {
      console.log('\n❌ FAILED NAVIGATION TESTS:');

      const failedByPage = new Map<string, NavigationTestResult[]>();
      for (const result of failedTests) {
        const pageResults = failedByPage.get(result.pageName) || [];
        failedByPage.set(result.pageName, [...pageResults, result]);
      }

      for (const [pageName, pageResults] of failedByPage) {
        console.log(`\n   Page: ${pageName}`);
        pageResults.forEach(result => {
          console.log(`       Test: ${result.testName}`);
          if (result.expected) {
            console.log(`       Expected: ${result.expected}`);
          }
          if (result.actual) {
            console.log(`       Actual: ${result.actual}`);
          }
          if (result.error) {
            console.log(`       Error: ${result.error}`);
          }
        });
      }

      console.log('\n');

      if (this.shouldThrowError) {
        throw new Error(
          `Navigation tests failed: ${failedTests.length} test(s) failed across ${failedPages.length} page(s)`
        );
      }
    } else if (results.length > 0) {
      console.log('\n✅ ALL NAVIGATION TESTS PASSED\n');
    }

    this.clearResults();
  }
}
