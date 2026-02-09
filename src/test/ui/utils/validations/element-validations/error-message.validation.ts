import { Locator, Page } from '@playwright/test';

import { IValidation, validationRecord } from '../../interfaces';

type ValidationResult = {
  pageUrl: string;
  scenario: string;
  passed: boolean;
  expected: string;
  actual?: string;
  error?: string;
};

export class ErrorMessageValidation implements IValidation {
  private static results: ValidationResult[] = [];
  private static testCounter = 0;
  private static emvFileTracking = new Map<string, { hasFile: boolean; fileName: string | null }>();

  async validate(page: Page, validation: string, fieldName: string, error: string | validationRecord): Promise<void> {
    if (validation !== 'errorMessage') {
      return;
    }

    let errorMessage: Locator;
    let scenario = '';
    let expected = '';

    if (typeof error === 'string') {
      scenario = 'Error message validation';
      expected = error;
      errorMessage = page.locator(`a.validation-error:has-text("${error}")`);
    } else {
      scenario = 'Error message validation';
      expected = `${error.header}: ${error.message}`;
      errorMessage = page.locator(`
        h2.govuk-error-summary__title:has-text("${error.header}") + p:has-text("${error.message}"),
        h2.govuk-error-summary__title:has-text("${error.header}") ~ div>ul>li:has-text("${error.message}")
      `);
    }

    const isVisible = await errorMessage
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const pageUrl = page.url();
    const pageName = ErrorMessageValidation.getPageName(pageUrl);

    ErrorMessageValidation.results.push({
      pageUrl,
      scenario,
      passed: isVisible,
      expected,
      actual: isVisible ? 'Found' : 'Not found',
    });

    if (!ErrorMessageValidation.emvFileTracking.has(pageName)) {
      ErrorMessageValidation.emvFileTracking.set(pageName, {
        hasFile: true,
        fileName: pageName,
      });
    }
  }

  static addResult(result: ValidationResult): void {
    this.results.push(result);
  }

  static trackMissingEMVFile(pageUrl: string): void {
    const pageName = this.getPageName(pageUrl);
    if (!this.emvFileTracking.has(pageName)) {
      this.emvFileTracking.set(pageName, {
        hasFile: false,
        fileName: null,
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
    const pagesWithoutEMV = trackingEntries.filter(([_, data]) => !data.hasFile).map(([pageName]) => pageName);

    const validationResults = results.filter(r => r.scenario.includes('Error message'));
    const passedValidations = validationResults.filter(r => r.passed);
    const failedValidations = validationResults.filter(r => !r.passed);

    const passedPages = [...new Set(passedValidations.map(r => this.getPageName(r.pageUrl)))];
    const failedPages = [...new Set(failedValidations.map(r => this.getPageName(r.pageUrl)))];

    console.log(`\n📊 ERROR MESSAGE VALIDATION SUMMARY (Test #${this.testCounter}):`);
    console.log(`   Total pages validated for error messages: ${allPages.length}`);
    console.log(`   Number of pages passed: ${passedPages.length}`);
    console.log(`   Number of pages failed: ${failedPages.length}`);
    console.log(`   Number of missing EMV files: ${pagesWithoutEMV.length}`);

    if (passedPages.length > 0) {
      console.log(`   Passed pages: ${passedPages.join(', ') || 'None'}`);
    }

    if (pagesWithoutEMV.length > 0) {
      console.log(`   EMV files not found: ${pagesWithoutEMV.join(', ') || 'None'}`);
    }

    if (failedValidations.length > 0) {
      console.log('\n❌ FAILED ERROR MESSAGE VALIDATIONS:');

      const failedByPage = new Map<string, ValidationResult[]>();
      for (const result of failedValidations) {
        const pageName = this.getPageName(result.pageUrl);
        const pageResults = failedByPage.get(pageName) || [];
        failedByPage.set(pageName, [...pageResults, result]);
      }

      for (const [pageName, pageResults] of failedByPage) {
        console.log(`\n   Page: ${pageName}`);
        pageResults.forEach(result => {
          console.log(`     - Scenario: ${result.scenario}`);
          console.log(`       Expected: ${result.expected}`);
          console.log(`       Status: ${result.actual}`);
          if (result.error) {
            console.log(`       Error: ${result.error}`);
          }
        });
      }

      console.log('\n');
      throw new Error(`Error message validation failed: ${failedValidations.length} error(s) not found`);
    } else if (validationResults.length > 0) {
      console.log('\n✅ ALL ERROR MESSAGE VALIDATIONS PASSED\n');
    } else if (pagesWithEMV.length > 0) {
      console.log('\n⚠️  EMV files found but no validations performed\n');
    }

    this.clearResults();
  }

  private static getPageName(url: string): string {
    const segments = url.split('/').filter(Boolean);
    return segments[segments.length - 1] || 'home';
  }
}
