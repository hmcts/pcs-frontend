import * as fs from 'fs';
import * as path from 'path';

import { Page, expect } from '@playwright/test';

import { IValidation } from '../../interfaces';

import { PageContentValidation } from './pageContent.validation';

type ValidationResult = {
  pageUrl: string;
  pageName: string;
  validationType: string;
  elementKey: string;
  passed: boolean;
  error?: string;
};

export class VisibilityValidation implements IValidation {
  private static results: ValidationResult[] = [];
  private static testCounter = 0;
  private static pagesWithVisibilityTests = new Set<string>();
  private static pagesPassed = new Set<string>();
  private static missingVisibilityMethods = new Set<string>();
  private static shouldThrowError = true;
  private static readonly MAPPING_PATH = path.join(__dirname, '../../../config/urlToFileMapping.config.ts');

  async validate(page: Page, validation: string, fieldName: string): Promise<void> {
    const pageUrl = page.url();
    const pageName = await this.getPageNameFromUrl(pageUrl, page);

    VisibilityValidation.pagesWithVisibilityTests.add(pageName);

    const elementKey = fieldName;

    const contentValidation = new PageContentValidation();
    const elementType = (contentValidation as any).getElementType(elementKey);
    const pattern = (contentValidation as any).locatorPatterns?.[elementType];

    let locator;
    if (pattern) {
      locator = pattern(page, elementKey);
    } else {
      locator = page.locator(
        `label:has-text("${elementKey}"), span:has-text("${elementKey}"), div:has-text("${elementKey}")`
      );
    }

    const validationsMap = new Map<string, () => Promise<void>>([
      ['elementToBeVisible', () => this.elementToBeVisible(locator, pageName, elementKey, validation)],
      ['elementNotToBeVisible', () => this.elementNotToBeVisible(locator, pageName, elementKey, validation)],
      ['waitUntilElementDisappears', () => this.waitUntilElementDisappears(locator, pageName, elementKey, validation)],
    ]);

    const validationToPerform = validationsMap.get(validation);
    if (!validationToPerform) {
      throw new Error(`No action found for '${validation}'`);
    }

    await validationToPerform();
  }

  private async elementToBeVisible(
    locator: any,
    pageName: string,
    elementKey: string,
    validationType: string
  ): Promise<void> {
    let visibilityIsPassed = false;
    let errorMsg = '';

    try {
      await expect(locator.first()).toBeVisible({ timeout: 2000 });
      visibilityIsPassed = true;
    } catch (e) {
      visibilityIsPassed = false;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    VisibilityValidation.results.push({
      pageUrl: '',
      pageName,
      validationType,
      elementKey,
      passed: visibilityIsPassed,
      error: errorMsg,
    });

    if (visibilityIsPassed) {
      VisibilityValidation.pagesPassed.add(pageName);
    }
  }

  private async elementNotToBeVisible(
    locator: any,
    pageName: string,
    elementKey: string,
    validationType: string
  ): Promise<void> {
    let isPassed = true;
    let errorMsg = '';

    try {
      await expect(locator.first()).not.toBeVisible({ timeout: 2000 });
    } catch (e) {
      isPassed = false;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    VisibilityValidation.results.push({
      pageUrl: '',
      pageName,
      validationType,
      elementKey,
      passed: isPassed,
      error: errorMsg,
    });

    if (isPassed) {
      VisibilityValidation.pagesPassed.add(pageName);
    }
  }

  private async waitUntilElementDisappears(
    locator: any,
    pageName: string,
    elementKey: string,
    validationType: string
  ): Promise<void> {
    let isPassed = false;
    let errorMsg = '';

    try {
      const elements = await locator.all();
      await Promise.all(elements.map((el: any) => el.waitFor({ state: 'hidden', timeout: 2000 })));
      isPassed = true;
    } catch (e) {
      isPassed = false;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    VisibilityValidation.results.push({
      pageUrl: '',
      pageName,
      validationType,
      elementKey,
      passed: isPassed,
      error: errorMsg,
    });

    if (isPassed) {
      VisibilityValidation.pagesPassed.add(pageName);
    }
  }

  private async getPageNameFromUrl(url: string, page?: Page): Promise<string> {
    try {
      const { pathname } = new URL(url);
      const segments = pathname.split('/').filter(Boolean);
      const urlSegment = segments.at(-1) || 'home';

      const mapping = this.loadMapping();
      if (!mapping) {
        return urlSegment;
      }

      if (/^\d+$/.test(urlSegment) && page) {
        const headerText = await this.getHeaderText(page);
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

  private loadMapping(): Record<string, string> | null {
    try {
      if (!fs.existsSync(VisibilityValidation.MAPPING_PATH)) {
        return null;
      }
      const mappingContent = fs.readFileSync(VisibilityValidation.MAPPING_PATH, 'utf8');
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

  static trackPageWithVisibilityTests(pageName: string): void {
    VisibilityValidation.pagesWithVisibilityTests.add(pageName);
  }

  static trackPagePassed(pageName: string): void {
    VisibilityValidation.pagesPassed.add(pageName);
  }

  static trackMissingMethod(pageName: string): void {
    VisibilityValidation.missingVisibilityMethods.add(pageName);
  }

  static trackValidationError(pageName: string, error?: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    VisibilityValidation.results.push({
      pageUrl: '',
      pageName,
      validationType: 'execution',
      elementKey: 'test',
      passed: false,
      error: errorMessage,
    });
  }

  static finaliseTest(): void {
    VisibilityValidation.testCounter++;

    const totalPages =
      VisibilityValidation.pagesWithVisibilityTests.size + VisibilityValidation.missingVisibilityMethods.size;

    if (totalPages === 0 && VisibilityValidation.results.length === 0) {
      console.log(`\n📊 VISIBILITY VALIDATION (Test #${VisibilityValidation.testCounter}):`);
      console.log('   No pages checked for visibility validation');
      return;
    }

    const failureDetails = new Map<string, { validationType: string; elementKey: string; error?: string }[]>();
    const failedPages = new Set<string>();
    const passedPages = new Set<string>();

    for (const result of VisibilityValidation.results) {
      if (!result.passed) {
        failedPages.add(result.pageName);
        const failures = failureDetails.get(result.pageName) || [];
        failures.push({
          validationType: result.validationType,
          elementKey: result.elementKey,
          error: result.error,
        });
        failureDetails.set(result.pageName, failures);
      } else {
        passedPages.add(result.pageName);
      }
    }

    for (const pageName of failedPages) {
      passedPages.delete(pageName);
    }

    console.log(`\n📊 VISIBILITY VALIDATION SUMMARY (Test #${VisibilityValidation.testCounter}):`);
    console.log(`   Total pages with visibility tests: ${totalPages}`);
    console.log(`   Number of pages passed: ${passedPages.size}`);
    console.log(`   Number of pages failed: ${failedPages.size}`);
    console.log(`   Missing visibility methods: ${VisibilityValidation.missingVisibilityMethods.size}`);

    if (passedPages.size > 0) {
      console.log(`   Passed pages: ${Array.from(passedPages).join(', ')}`);
    }

    if (failedPages.size > 0) {
      console.log(`   Failed pages: ${Array.from(failedPages).join(', ')}`);
    }

    if (VisibilityValidation.missingVisibilityMethods.size > 0) {
      console.log(
        `   Visibility methods not found: ${Array.from(VisibilityValidation.missingVisibilityMethods).join(', ')}`
      );
    }

    if (failedPages.size > 0) {
      console.log('\n❌ FAILED VISIBILITY VALIDATIONS:');
      for (const pageName of Array.from(failedPages).sort()) {
        const failures = failureDetails.get(pageName);
        console.log(`   Page: ${pageName}`);
        if (failures) {
          failures.forEach(failure => {
            if (failure.validationType === 'elementToBeVisible') {
              console.log(`       Element should be visible but is hidden: ${failure.elementKey}`);
            } else if (failure.validationType === 'elementNotToBeVisible') {
              console.log(`       Element should be hidden but is visible: ${failure.elementKey}`);
            } else if (failure.validationType === 'waitUntilElementDisappears') {
              console.log(`       Element should disappear but is still visible: ${failure.elementKey}`);
            } else {
              const lines = failure.error?.split('\n') || [];
              console.log(`       ${lines[0]}`);
              for (let i = 1; i < lines.length; i++) {
                console.log(`       ${lines[i]}`);
              }
            }
          });
        }
        console.log('');
      }
    }

    const hasFailures = failedPages.size > 0;

    if (hasFailures) {
      console.log('❌ VISIBILITY VALIDATIONS FAILED\n');
    } else if (passedPages.size > 0) {
      console.log('\n✅ ALL VISIBILITY VALIDATIONS PASSED\n');
    } else if (VisibilityValidation.pagesWithVisibilityTests.size > 0) {
      console.log('\n⚠️  Visibility tests found but no validations performed\n');
    }

    VisibilityValidation.clearResults();

    if (hasFailures && VisibilityValidation.shouldThrowError) {
      throw new Error(`Visibility validation failed: ${failedPages.size} page(s) have failures`);
    }
  }

  static clearResults(): void {
    VisibilityValidation.results = [];
    VisibilityValidation.pagesWithVisibilityTests.clear();
    VisibilityValidation.pagesPassed.clear();
    VisibilityValidation.missingVisibilityMethods.clear();
  }
}
