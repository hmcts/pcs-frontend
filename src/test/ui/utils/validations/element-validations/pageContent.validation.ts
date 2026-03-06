import * as fs from 'fs';
import * as path from 'path';

import { Page } from '@playwright/test';

import { contactUs } from '../../../data/section-data/contactUs.section.data';
import { escapeForRegex, exactTextWithOptionalWhitespaceRegex } from '../../common/string.utils';
import { performAction } from '../../controller';
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
  private static missingDataFiles = new Set<string>();
  private static testCounter = 0;
  private static pageToFileNameMap = new Map<string, string>();
  private static pageToHeaderTextMap = new Map<string, string>(); // Track header text for logging

  private readonly locatorPatterns = {
    Button: (page: Page, value: string) =>
      page.locator(`
                    button:text-is("${value}"),
                    [value="${value}"],
                    [role="link"]:text-is("${value}"),
                    a:text-is("${value}"),
                    button:has(:text-is("${value}"))`),
    Link: (page: Page, value: string) =>
      page.locator(`
                    a:text-is("${value}"),
                    a.govuk-link:text-is("${value}"),
                    button.govuk-js-link:text-is("${value}"),
                    [role="link"]:text-is("${value}"),
                    [aria-label="${value}"]`),
    Summary: (page: Page, value: string) =>
      page.locator(`
                    summary:text-is("${value}"),
                    summary .govuk-details__summary-text:text-is("${value}")`),
    Header: (page: Page, value: string) =>
      page.getByRole('heading', { name: new RegExp(`^${escapeForRegex(value)}$`) }).or(
        page.locator(`
                    legend:text-is("${value}"),
                    h1:text-is("${value}"),
                    h2:text-is("${value}"),
                    h3:text-is("${value}")`)
      ),
    Caption: (page: Page, value: string) =>
      page.locator(`
                    caption:text-is("${value}"),
                    .caption:text-is("${value}"),
                    figcaption:text-is("${value}"),
                    .figcaption:text-is("${value}"),
                    span.govuk-caption-l:text-is("${value}"),
                    [aria-label="${value}"]`),
    Checkbox: (page: Page, value: string) =>
      page.getByRole('checkbox', { name: new RegExp(`^${escapeForRegex(value)}$`) }).or(
        page.locator(`
                    label:text-is("${value}") ~ input[type="checkbox"],
                    label:text-is("${value}") + input[type="checkbox"],
                    .checkbox:text-is("${value}") ~ input[type="checkbox"]`)
      ),
    Question: (page: Page, value: string) =>
      page.getByText(value, { exact: true }).or(
        page.locator(`
                    h1:text-is("${value}"),
                    legend:text-is("${value}"),
                    label:text-is("${value}") ~ input[type="radio"]`)
      ),
    RadioOption: (page: Page, value: string) =>
      page.getByRole('radio', { name: new RegExp(`^${escapeForRegex(value)}$`) }).or(
        page.locator(`
                    label:text-is("${value}") ~ input[type="radio"],
                    label:text-is("${value}") + input[type="radio"],
                    .radio-option:text-is("${value}") ~ input[type="radio"]`)
      ),
    SelectLabel: (page: Page, value: string) =>
      page.locator(`
                    label:text-is("${value}") ~ select,
                    .select:text-is("${value}") ~ select`),
    SelectOption: (page: Page, value: string) =>
      page.locator(`
                    option:text-is("${value}"),
                    select option:text-is("${value}")`),
    HintText: (page: Page, value: string) =>
      page.locator(`
                    .govuk-hint:text-is("${value}"),
                    div:text-is("${value}")`),
    TextLabel: (page: Page, value: string) =>
      page.locator(`
                    label:text-is("${value}"),
                    .label:text-is("${value}")`),
    Paragraph: (page: Page, value: string) =>
      page
        .getByText(value, { exact: true })
        .or(page.getByText(exactTextWithOptionalWhitespaceRegex(value)))
        .or(page.locator(`span:text-is("${value}"),
                    .paragraph:text-is("${value}"),
                    p:text-is("${value}"),
                    markdown:text-is("${value}"),
                    .govuk-caption-l:text-is("${value}"),
                    .body:text-is("${value}"),
                    .text-content:text-is("${value}"),
                    .govuk-body:text-is("${value}"),
                    .govuk-list:text-is("${value}")`)),
    List: (page: Page, value: string) =>
      page.locator(`
                    li:text-is("${value}"),
                    ul li:text-is("${value}"),
                    ol li:text-is("${value}")`),
    Text: (page: Page, value: string) => page.locator(`:text-is("${value}")`),
    Tab: (page: Page, value: string) => page.getByRole('tab', { name: new RegExp(`^${escapeForRegex(value)}$`) }),
  };

  async validate(page: Page, _validation: string, _fieldName?: string, _data?: never): Promise<void> {
    await this.validateCurrentPage(page);
  }

  async validateCurrentPage(page: Page): Promise<void> {
    await page.waitForLoadState('load');
    const pageUrl = page.url();
    const pageResults: ValidationResult[] = [];
    const pageData = await this.getPageData(page);

    if (!pageData) {
      return;
    }

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

  private async getPageData(page: Page): Promise<object | null> {
    const urlSegment = this.getUrlSegment(page.url());
    const fileName = await this.getFileName(urlSegment, page);

    if (!fileName) {
      PageContentValidation.missingDataFiles.add(urlSegment);
      return null;
    }

    PageContentValidation.pageToFileNameMap.set(page.url(), fileName);

    let pageData = this.loadPageDataFile(fileName);
    const contactUsData = this.loadPageDataFile('contactUs', true);
    if (this.getUrlSegment(page.url()) !== 'home') {
      pageData = { ...pageData, ...contactUsData };
      await performAction('clickSummary', contactUs.contactUsForHelpParagraph);
    }
    return pageData;
  }

  private getUrlSegment(url: string): string {
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] || 'home';
    } catch {
      const segments = url.split('/').filter(Boolean);
      return segments[segments.length - 1] || 'home';
    }
  }

  private async getFileName(urlSegment: string, page: Page): Promise<string | null> {
    try {
      const mappingPath = path.join(__dirname, '../../../config/urlToFileMapping.ts');
      if (!fs.existsSync(mappingPath)) {
        return null;
      }
      const mappingContent = fs.readFileSync(mappingPath, 'utf8');
      const match = mappingContent.match(/export default\s*({[\s\S]*?});/);
      if (!match) {
        return null;
      }
      const objectString = match[1].replace(/\s+/g, ' ').replace(/,\s*}/g, '}');
      const mapping = eval(`(${objectString})`);

      if (/^\d+$/.test(urlSegment)) {
        const headerText = await this.getHeaderText(page);
        if (headerText && mapping[headerText]) {
          // Store header text for logging
          PageContentValidation.pageToHeaderTextMap.set(page.url(), headerText);
          return mapping[headerText];
        }
        return null;
      }

      return mapping[urlSegment] || null;
    } catch {
      return null;
    }
  }

  private async getHeaderText(page: Page): Promise<string | null> {
    try {
      const h1Element = page.locator('h1').first();
      if (await h1Element.isVisible({ timeout: 2000 })) {
        const h1Text = await h1Element.textContent();
        if (h1Text && h1Text.trim() !== '') {
          return h1Text.trim();
        }
      }

      const h2Element = page.locator('h2').first();
      if (await h2Element.isVisible({ timeout: 2000 })) {
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

  private loadPageDataFile(fileName: string, sectionFile?: boolean): object | null {
    let filePath = path.join(__dirname, '../../../data/page-data', `${fileName}.page.data.ts`);
    if (sectionFile) {
      filePath = path.join(__dirname, '../../../data/section-data', `${fileName}.section.data.ts`);
    }
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
      return await locator.filter({ visible: true }).first().isVisible({ timeout: 5000 });
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

  static finaliseTest(): void {
    PageContentValidation.testCounter++;

    if (this.validationExecuted && this.validationResults.size === 0 && this.missingDataFiles.size === 0) {
      return;
    }

    this.validationExecuted = true;

    const failedPages = new Map<string, Map<string, string[]>>();
    const passedPages = new Set<string>();
    const validatedPages = new Set<string>();

    for (const [pageUrl, results] of Array.from(this.validationResults.entries())) {
      const pageName = this.getPageNameForLogging(pageUrl);
      validatedPages.add(pageName);

      const failedResults = results.filter(r => r.status === 'fail');

      if (failedResults.length === 0) {
        passedPages.add(pageName);
        continue;
      }

      const pageFailuresByType = new Map<string, string[]>();
      for (const result of failedResults) {
        const elementType = this.getElementType(result.element);
        const elements = pageFailuresByType.get(elementType) || [];
        pageFailuresByType.set(elementType, [...elements, result.expected]);
      }
      failedPages.set(pageName, pageFailuresByType);
    }

    const totalValidated = validatedPages.size;
    const passedCount = passedPages.size;
    const failedCount = failedPages.size;
    const missingFilesCount = this.missingDataFiles.size;

    console.log(`\n📊 PAGE CONTENT VALIDATION SUMMARY (Test #${this.testCounter}):`);
    console.log(`   Total pages validated: ${totalValidated}`);
    console.log(`   Number of pages passed: ${passedCount}`);
    console.log(`   Number of pages failed: ${failedCount}`);
    console.log(`   Missing data files: ${missingFilesCount}`);

    if (passedCount > 0) {
      console.log(`   Passed pages: ${Array.from(passedPages).join(', ') || 'None'}`);
    }
    if (failedCount > 0) {
      console.log(`   Failed pages: ${Array.from(failedPages.keys()).join(', ') || 'None'}`);
    }
    if (missingFilesCount > 0) {
      console.log(`   Page files not found: ${Array.from(this.missingDataFiles).join(', ') || 'None'}`);
    }

    process.stdout.write('');

    if (failedPages.size > 0) {
      console.log('\n❌ VALIDATION FAILED:\n');
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
      process.stdout.write('');
      throw new Error(`Page content validation failed: ${failedPages.size} pages have missing elements`);
    } else if (totalValidated > 0) {
      console.log('\n✅ VALIDATION PASSED: All intended pages validated successfully!');
      process.stdout.write('');
    } else if (missingFilesCount > 0) {
      console.log('\n⚠️  NO VALIDATION: Missing data files for all pages');
      process.stdout.write('');
    }

    this.clearValidationResults();
  }

  private static getPageNameForLogging(url: string): string {
    const headerText = this.pageToHeaderTextMap.get(url);
    if (headerText) {
      return headerText.replace(/\s+/g, '');
    }

    const segments = url.split('/').filter(Boolean);
    const segment = segments[segments.length - 1] || 'home';

    try {
      const mappingPath = path.join(__dirname, '../../../config/urlToFileMapping.ts');
      if (!fs.existsSync(mappingPath)) {
        return segment;
      }
      const mappingContent = fs.readFileSync(mappingPath, 'utf8');
      const match = mappingContent.match(/export default\s*({[\s\S]*?});/);
      if (!match) {
        return segment;
      }
      const objectString = match[1].replace(/\s+/g, ' ').replace(/,\s*}/g, '}');
      const mapping = eval(`(${objectString})`);
      return mapping[segment] || segment;
    } catch {
      return segment;
    }
  }

  private static getElementType(key: string): string {
    for (const type of ELEMENT_TYPES) {
      if (key.includes(type)) {
        return type;
      }
    }
    return 'Text';
  }

  static getValidationResults() {
    return this.validationResults;
  }

  static clearValidationResults(): void {
    this.validationResults.clear();
    this.missingDataFiles.clear();
    this.pageToFileNameMap.clear();
    this.pageToHeaderTextMap.clear();
    this.validationExecuted = false;
  }
}
