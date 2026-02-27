import { Locator, Page } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

type ValidationResult = {
  pageUrl: string;
  pageName: string;
  scenario: string;
  passed: boolean;
  expected: string;
  actual?: string;
  error?: string;
};

export class ErrorMessageValidation implements IValidation {
  private static results: ValidationResult[] = [];
  private static testCounter = 0;
  private static emvFileTracking = new Map<
    string,
    { hasFile: boolean; fileName: string | null; missingReason?: string }
  >();
  private static shouldThrowError = true;

  async validate(page: Page, validation: string, fieldName: string, error: string | validationRecord): Promise<void> {
    if (validation !== 'errorMessage') {
      return;
    }

    let scenario: string;
    let expected: string;
    let errorMessage: Locator;

    if (typeof error === 'string') {
      scenario = 'Error message validation';
      expected = error;
      errorMessage = page.locator(`.govuk-error-message:has-text("${error}"), .govuk-list--error:has-text("${error}")`);
    } else {
      scenario = 'Error message validation';
      expected = `${error.header}: ${error.message}`;
      errorMessage = page.locator(`
        h2.govuk-error-summary__title:has-text("${error.header}"),
        .govuk-error-summary__list a:has-text("${error.message}")
      `);
    }

    const isErrorMessageVisible = await errorMessage
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    const pageUrl = page.url();
    // We don't have pageName here, but we'll use URL for now and let the static methods handle naming
    const pageName = 'unknown';

    ErrorMessageValidation.results.push({
      pageUrl,
      pageName,
      scenario,
      passed: isErrorMessageVisible,
      expected,
      actual: isErrorMessageVisible ? 'Found' : 'Not found',
    });
  }

  static addResult(result: Omit<ValidationResult, 'pageName'> & { pageUrl: string; pageName: string }): void {
    this.results.push({
      ...result,
      pageName: result.pageName,
    });
  }

  static trackMissingEMVFile(pageUrl: string, pageName: string, reason?: string): void {
    if (!this.emvFileTracking.has(pageName)) {
      this.emvFileTracking.set(pageName, {
        hasFile: false,
        fileName: null,
        missingReason: reason || 'PFT file not found',
      });
    }
  }

  static getResults(): ValidationResult[] {
    return this.results;
  }

  static clearResults(): void {
    this.results = [];
    this.emvFileTracking.clear();
  }

  static setThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow;
  }

  static finaliseTest(): void {
    this.testCounter++;

    const results = this.results;
    const trackingEntries = Array.from(this.emvFileTracking.entries());

    if (trackingEntries.length === 0) {
      console.log(`\n📊 ERROR MESSAGE VALIDATION (Test #${this.testCounter}):`);
      console.log('   No pages checked for error message validation');
      return;
    }

    const allPages = trackingEntries.map(([pageName]) => pageName);
    const pagesWithEMV = trackingEntries.filter(([_, data]) => data.hasFile).map(([pageName]) => pageName);
    const pagesWithoutEMV = trackingEntries
      .filter(([_, data]) => !data.hasFile)
      .map(([pageName, data]) => `${pageName} (${data.missingReason || 'PFT file not found'})`);

    const validationResults = results.filter(r => r.scenario.includes('Error message'));
    const passedValidations = validationResults.filter(r => r.passed);
    const failedValidations = validationResults.filter(r => !r.passed);

    const passedPages = [...new Set(passedValidations.map(r => r.pageName))];
    const failedPages = [...new Set(failedValidations.map(r => r.pageName))];

    console.log(`\n📊 ERROR MESSAGE VALIDATION SUMMARY (Test #${this.testCounter}):`);
    console.log(`   Total pages validated: ${allPages.length}`);
    console.log(`   Number of pages passed: ${passedPages.length}`);
    console.log(`   Number of pages failed: ${failedPages.length}`);

    if (pagesWithoutEMV.length > 0) {
      console.log(`   Missing/Invalid PFT configurations: ${pagesWithoutEMV.length}`);
      console.log(`   Details: ${pagesWithoutEMV.join(', ')}`);
    }

    if (passedPages.length > 0) {
      console.log(`   Passed pages: ${passedPages.join(', ') || 'None'}`);
    }

    if (failedValidations.length > 0) {
      console.log('\n❌ FAILED ERROR MESSAGE VALIDATIONS:');

      const failedByPage = new Map<string, ValidationResult[]>();
      for (const result of failedValidations) {
        const pageResults = failedByPage.get(result.pageName) || [];
        failedByPage.set(result.pageName, [...pageResults, result]);
      }

      for (const [pageName, pageResults] of failedByPage) {
        console.log(`\n   Page: ${pageName}`);
        pageResults.forEach(result => {
          console.log(`       Expected: ${result.expected}`);
          console.log(`       Status: ${result.actual}`);
          if (result.error) {
            console.log(`       Error: ${result.error}`);
          }
        });
      }

      console.log('\n');

      if (this.shouldThrowError) {
        throw new Error(
          `Error message validation failed: ${failedValidations.length} error(s) not found across ${failedPages.length} page(s)`
        );
      }
    } else if (validationResults.length > 0) {
      console.log('\n✅ ALL ERROR MESSAGE VALIDATIONS PASSED\n');
    } else if (pagesWithEMV.length > 0) {
      console.log('\n⚠️  PFT files found but no validations performed\n');
    }

    this.clearResults();
  }
}
