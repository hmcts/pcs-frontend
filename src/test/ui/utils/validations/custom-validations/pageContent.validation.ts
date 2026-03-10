import * as fs from 'fs';
import * as path from 'path';

import { Page } from '@playwright/test';

import { IValidation } from '../../interfaces';

const ELEMENT_TYPES = [
  'Button',
  'Link',
  'Header',
  'Caption',
  'Checkbox',
  'Question',
  'RadioOption',
  'SelectLabel',
  'SelectOption',
  'HintText',
  'TextLabel',
  'Paragraph',
  'List',
  'Summary',
] as const;

type ValidationResult = { element: string; expected: string; status: 'pass' | 'fail' };

export class PageContentValidation implements IValidation {
  private static validationResults = new Map<string, ValidationResult[]>();
  private static validationExecuted = false;
  private static pagesWithData = new Set<string>();
  private static pagesValidated = new Set<string>();
  private static missingDataFiles = new Set<string>();
  private static testCounter = 0;
  private static pageToHeaderTextMap = new Map<string, string>();

  private readonly locatorPatterns = {
    Button: (page: Page, value: string) =>
      page.locator(`
                    button:text-is("${value}"),
                    [value="${value}"],
                    :has-text("${value}") + button,
                    [role="link"]:text("${value}"),
                    a:text("${value}"),
                    :has-text("${value}") ~ button`),
    Link: (page: Page, value: string) =>
      page.locator(`
                    a:text("${value}"),
                    a.govuk-link:text("${value}"),
                    button.govuk-js-link:text("${value}"),
                    [role="link"]:text("${value}"),
                    [aria-label*="${value}"]:text("${value}")`),
    Summary: (page: Page, value: string) =>
      page.locator(`
                    summary:has-text("${value}"),
                    summary .govuk-details__summary-text:text("${value}")`),
    Header: (page: Page, value: string) =>
      page.locator(`
                    legend:has-text("${value}"),
                    h1:text("${value}"),
                    h2:text("${value}"),
                    h3:text("${value}")`),
    Caption: (page: Page, value: string) =>
      page.locator(`
                    caption:text("${value}"),
                    .caption:text("${value}"),
                    figcaption:text("${value}"),
                    .figcaption:text("${value}"),
                    span.govuk-caption-l:text("${value}"),
                    [aria-label*="${value}"]:text("${value}")`),
    Checkbox: (page: Page, value: string) =>
      page.locator(`
                    label:text("${value}") ~ input[type="checkbox"],
                    label:text("${value}") + input[type="checkbox"],
                    .checkbox:text("${value}") ~ input[type="checkbox"],
                    label >> text=${value} >> xpath=..//input[@type="checkbox"]`),
    Question: (page: Page, value: string) =>
      page.locator(`
                    h1:has-text("${value}"),
                    legend:has-text("${value}"),
                    label:text("${value}") ~ input[type="radio"]`),
    RadioOption: (page: Page, value: string) =>
      page.locator(`
                    label:text("${value}") ~ input[type="radio"],
                    label:text("${value}") + input[type="radio"],
                    .radio-option:text("${value}") ~ input[type="radio"],
                    label >> text=${value} >> xpath=..//input[@type="radio"]`),
    SelectLabel: (page: Page, value: string) =>
      page.locator(`
                    label:text("${value}") ~ select,
                    .select:text("${value}") ~ select`),
    SelectOption: (page: Page, value: string) =>
      page.locator(`
                    option:text("${value}"),
                    select option:text("${value}")`),
    HintText: (page: Page, value: string) =>
      page.locator(`
                    .govuk-hint:text("${value}"),
                    div:text("${value}")`),
    TextLabel: (page: Page, value: string) =>
      page.locator(`
                    label:has-text("${value}"),
                    .label:has-text("${value}")`),
    Paragraph: (page: Page, value: string) =>
      page.locator(`span:text("${value}"),
                    .paragraph:text("${value}"),
                    p:text("${value}"),
                    markdown:text("${value}"),
                    .govuk-caption-l:text("${value}"),
                    .body:text("${value}"),
                    .text-content:text("${value}"),
                    .govuk-body:text("${value}"),
                     div:text-is("${value}"),
                    .govuk-list:text("${value}")`),
    List: (page: Page, value: string) =>
      page.locator(`
                    li:text("${value}"),
                    ul li:text("${value}"),
                    ol li:text("${value}")`),
    Text: (page: Page, value: string) => page.locator(`:text("${value}")`),
    Tab: (page: Page, value: string) => page.getByRole('tab', { name: value }),
  };

  async validate(_page: Page, _validation: string, _fieldName?: string, _data?: never): Promise<void> {}

  async validateCurrentPage(page: Page, pageName: string): Promise<void> {
    await page.waitForLoadState('load');
    const pageUrl = page.url();
    const pageResults: ValidationResult[] = [];
    const pageData = await this.getPageData(pageName);

    if (!pageData) {
      return;
    }

    PageContentValidation.pagesValidated.add(pageName);

    for (const [key, value] of Object.entries(pageData)) {
      if (
        key.includes('Input') ||
        key.includes('Hidden') ||
        key.includes('Validation') ||
        key.includes('ErrorMessage')
      ) {
        continue;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        const elementType = this.getElementType(key);
        const isVisible = await this.isElementVisible(page, value as string, elementType);
        pageResults.push({ element: key, expected: value as string, status: isVisible ? 'pass' : 'fail' });
      }
    }

    PageContentValidation.validationResults.set(pageUrl, pageResults);
  }

  private async getPageData(pageName: string): Promise<object | null> {
    return this.loadPageDataFile(pageName);
  }

  private loadPageDataFile(fileName: string): object | null {
    const filePath = path.join(__dirname, '../../../data/page-data', `${fileName}.page.data.ts`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      delete require.cache[require.resolve(filePath)];
      const module = require(filePath);
      return module.default || module[fileName] || module[Object.keys(module)[0]];
    } catch {
      return null;
    }
  }

  private async isElementVisible(page: Page, expectedValue: string, elementType: string): Promise<boolean> {
    const pattern = this.locatorPatterns[elementType as keyof typeof this.locatorPatterns];
    if (!pattern) {
      return false;
    }
    try {
      const locator = pattern(page, expectedValue);
      return await locator.first().isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  private getElementType(key: string): string {
    for (const type of ELEMENT_TYPES) {
      if (key.includes(type)) {
        return type;
      }
    }
    return 'Text';
  }

  static trackPageWithData(pageName: string): void {
    PageContentValidation.pagesWithData.add(pageName);
  }

  static trackMissingDataFile(pageName: string): void {
    PageContentValidation.missingDataFiles.add(pageName);
  }

  static trackValidationError(pageName: string, _error?: unknown): void {
    PageContentValidation.missingDataFiles.add(pageName);
  }

  static finaliseTest(): void {
    PageContentValidation.testCounter++;

    if (
      PageContentValidation.validationExecuted &&
      PageContentValidation.validationResults.size === 0 &&
      PageContentValidation.missingDataFiles.size === 0
    ) {
      return;
    }

    PageContentValidation.validationExecuted = true;

    const failedPages = new Map<string, Map<string, string[]>>();
    const passedPages = new Set<string>();

    const pageToResults = new Map<string, ValidationResult[]>();

    for (const [pageUrl, results] of Array.from(PageContentValidation.validationResults.entries())) {
      let pageName = 'unknown';
      const urlParts = pageUrl.split('/');
      if (urlParts.length > 0) {
        pageName = urlParts[urlParts.length - 1] || 'home';
      }
      pageToResults.set(pageName, results);
    }

    for (const [pageName, results] of Array.from(pageToResults.entries())) {
      const failedResults = results.filter(r => r.status === 'fail');

      if (failedResults.length === 0) {
        passedPages.add(pageName);
        continue;
      }

      const pageFailuresByType = new Map<string, string[]>();
      for (const result of failedResults) {
        const elementType = PageContentValidation.getElementTypeStatic(result.element);
        const elements = pageFailuresByType.get(elementType) || [];
        pageFailuresByType.set(elementType, [...elements, result.expected]);
      }
      failedPages.set(pageName, pageFailuresByType);
    }

    const totalValidated = PageContentValidation.pagesValidated.size;
    const passedCount = passedPages.size;
    const failedCount = failedPages.size;
    const missingFilesCount = PageContentValidation.missingDataFiles.size;

    console.log(`\n📊 PAGE CONTENT VALIDATION SUMMARY (Test #${PageContentValidation.testCounter}):`);
    console.log(`   Total pages validated: ${totalValidated}`);
    console.log(`   Number of pages passed: ${passedCount}`);
    console.log(`   Number of pages failed: ${failedCount}`);
    console.log(`   Missing data files: ${missingFilesCount}`);

    if (passedCount > 0) {
      console.log(`   Passed pages: ${Array.from(passedPages).join(', ')}`);
    }

    if (failedCount > 0) {
      console.log(`   Failed pages: ${Array.from(failedPages.keys()).join(', ')}`);
    }

    if (missingFilesCount > 0) {
      console.log(`   Page files not found: ${Array.from(PageContentValidation.missingDataFiles).join(', ')}`);
    }

    if (failedPages.size > 0) {
      console.log('\n❌ VALIDATION FAILED:');
      for (const [pageName, pageFailures] of failedPages) {
        console.log(`   Page: ${pageName}`);
        let pageFailureCount = 0;
        for (const [elementType, elements] of pageFailures) {
          pageFailureCount += elements.length;
          console.log(`     ${elementType} elements (${elements.length}):`);
          elements.forEach(element => console.log(`       - ${element}`));
        }
        console.log(`     Total missing on this page: ${pageFailureCount}\n`);
      }
      throw new Error(`Page content validation failed: ${failedPages.size} pages have missing elements`);
    } else if (totalValidated > 0) {
      console.log('\n✅ VALIDATION PASSED: All intended pages validated successfully!\n');
    } else if (missingFilesCount > 0) {
      console.log('\n⚠️  NO VALIDATION: Missing data files for all pages\n');
    }

    PageContentValidation.clearValidationResults();
  }

  private static getElementTypeStatic(key: string): string {
    for (const type of ELEMENT_TYPES) {
      if (key.includes(type)) {
        return type;
      }
    }
    return 'Text';
  }

  static clearValidationResults(): void {
    PageContentValidation.validationResults.clear();
    PageContentValidation.missingDataFiles.clear();
    PageContentValidation.pagesWithData.clear();
    PageContentValidation.pagesValidated.clear();
    PageContentValidation.pageToHeaderTextMap.clear();
    PageContentValidation.validationExecuted = false;
  }
}
