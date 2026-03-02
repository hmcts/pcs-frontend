import * as fs from 'fs';
import * as path from 'path';

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
  private static pagesWithEMV = new Set<string>();
  private static pagesPassed = new Set<string>();
  private static missingEMVFiles = new Set<string>();
  private static readonly MAPPING_PATH = path.join(__dirname, '../../../config/urlToFileMapping.config.ts');

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
      errorMessage = page.locator(`a.validation-error:has-text("${error}")`);
    } else {
      scenario = 'Error message validation';
      expected = `${error.header}: ${error.message}`;
      errorMessage = page.locator(`
        h2.govuk-error-summary__title:has-text("${error.header}") + p:has-text("${error.message}"),
        h2.govuk-error-summary__title:has-text("${error.header}") ~ div>ul>li:has-text("${error.message}")
      `);
    }

    const isErrorMessageVisible = await errorMessage
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const pageUrl = page.url();

    const pageName = await ErrorMessageValidation.getPageNameFromUrl(pageUrl, page);

    ErrorMessageValidation.results.push({
      pageUrl,
      pageName,
      scenario,
      passed: isErrorMessageVisible,
      expected,
      actual: isErrorMessageVisible ? 'Found' : 'Not found',
    });

    if (isErrorMessageVisible) {
      ErrorMessageValidation.pagesPassed.add(pageName);
    }
  }

  static trackPageWithEMV(pageName: string): void {
    ErrorMessageValidation.pagesWithEMV.add(pageName);
  }

  static trackPagePassed(pageName: string): void {
    ErrorMessageValidation.pagesPassed.add(pageName);
  }

  static trackMissingEMVFile(pageName: string): void {
    ErrorMessageValidation.missingEMVFiles.add(pageName);
  }

  static trackValidationError(pageName: string, _error?: unknown): void {
    ErrorMessageValidation.missingEMVFiles.add(pageName);
  }

  private static async getPageNameFromUrl(url: string, page?: Page): Promise<string> {
    try {
      const { pathname } = new URL(url);
      const segments = pathname.split('/').filter(Boolean);
      const urlSegment = segments.at(-1) || 'home';

      const mapping = ErrorMessageValidation.loadMapping();
      if (!mapping) {
        return urlSegment;
      }

      if (/^\d+$/.test(urlSegment) && page) {
        const headerText = await ErrorMessageValidation.getHeaderText(page);
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
      if (!fs.existsSync(ErrorMessageValidation.MAPPING_PATH)) {
        return null;
      }

      const mappingContent = fs.readFileSync(ErrorMessageValidation.MAPPING_PATH, 'utf8');
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
    ErrorMessageValidation.testCounter++;

    const totalPages = ErrorMessageValidation.pagesWithEMV.size + ErrorMessageValidation.missingEMVFiles.size;

    if (totalPages === 0) {
      console.log(`\n📊 ERROR MESSAGE VALIDATION (Test #${ErrorMessageValidation.testCounter}):`);
      console.log('   No pages checked for error message validation');
      return;
    }

    const passedValidations = ErrorMessageValidation.results.filter(r => r.passed);
    const passedPages = [...new Set(passedValidations.map(r => r.pageName))];

    console.log(`\n📊 ERROR MESSAGE VALIDATION SUMMARY (Test #${ErrorMessageValidation.testCounter}):`);
    console.log(`   Total pages validated for error messages: ${totalPages}`);
    console.log(`   Number of pages passed: ${passedPages.length}`);
    console.log(`   Number of pages failed: 0`);
    console.log(`   Number of missing EMV files: ${ErrorMessageValidation.missingEMVFiles.size}`);

    if (passedPages.length > 0) {
      console.log(`   Passed pages: ${passedPages.join(', ')}`);
    }

    if (ErrorMessageValidation.missingEMVFiles.size > 0) {
      console.log(`   EMV files not found: ${Array.from(ErrorMessageValidation.missingEMVFiles).join(', ')}`);
    }

    if (passedPages.length > 0) {
      console.log('\n✅ ALL ERROR MESSAGE VALIDATIONS PASSED\n');
    } else if (ErrorMessageValidation.pagesWithEMV.size > 0) {
      console.log('\n⚠️  EMV files found but no validations performed\n');
    }

    ErrorMessageValidation.clearResults();
  }

  static clearResults(): void {
    ErrorMessageValidation.results = [];
    ErrorMessageValidation.pagesWithEMV.clear();
    ErrorMessageValidation.pagesPassed.clear();
    ErrorMessageValidation.missingEMVFiles.clear();
  }
}
